"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractMockFromPdf } from "@/lib/anthropic";
import { DEFAULT_PASS_PERCENTAGE, DEFAULT_TIME_LIMIT_MINUTES } from "@/lib/constants";
import { revalidatePath } from "next/cache";
import type { MockDraftPayload, OptionLetter } from "@/lib/types";

export interface UploadActionState {
  error?: string;
}

const MAX_PDF_BYTES = 25 * 1024 * 1024; // 25 MB

export async function uploadAndParsePdf(
  _prev: UploadActionState,
  formData: FormData,
): Promise<UploadActionState> {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") {
    return { error: "You must be signed in as faculty to upload a mock." };
  }

  const file = formData.get("pdf");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please choose a PDF file to upload." };
  }
  if (file.type !== "application/pdf") {
    return { error: "Only PDF files are supported." };
  }
  if (file.size > MAX_PDF_BYTES) {
    return { error: "PDF is too large (max 25 MB)." };
  }

  const admin = createAdminClient();
  const arrayBuffer = await file.arrayBuffer();
  const bytes = Buffer.from(arrayBuffer);

  const storagePath = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const { error: storageError } = await admin.storage
    .from("mock-pdfs")
    .upload(storagePath, bytes, { contentType: "application/pdf" });

  if (storageError) {
    return { error: `Could not store PDF: ${storageError.message}` };
  }

  let extracted;
  try {
    extracted = await extractMockFromPdf(bytes.toString("base64"));
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "AI extraction failed. Please try again.",
    };
  }

  if (extracted.questions.length === 0) {
    return { error: "No questions could be extracted from this PDF. Try a clearer scan." };
  }

  const totalMarks = extracted.questions.reduce((sum, q) => sum + q.marks, 0);

  const { data: mock, error: mockError } = await admin
    .from("mocks")
    .insert({
      mock_name: extracted.suggested_mock_name || "Untitled Mock",
      subject: extracted.suggested_subject || "General",
      teacher_id: user.id,
      teacher_name: user.full_name,
      time_limit_minutes: DEFAULT_TIME_LIMIT_MINUTES,
      total_questions: extracted.questions.length,
      total_marks: totalMarks,
      pass_percentage: DEFAULT_PASS_PERCENTAGE,
      source_pdf_path: storagePath,
      status: "draft",
    })
    .select()
    .single();

  if (mockError || !mock) {
    return { error: `Could not create mock: ${mockError?.message}` };
  }

  const questionRows = extracted.questions.map((q) => ({
    mock_id: mock.id,
    question_number: q.question_number,
    question_text: q.question_text,
    option_a: q.option_a,
    option_b: q.option_b,
    option_c: q.option_c,
    option_d: q.option_d,
    correct_option: q.correct_option as OptionLetter,
    explanation: q.explanation,
    marks: q.marks,
  }));

  const { error: questionsError } = await admin.from("questions").insert(questionRows);
  if (questionsError) {
    await admin.from("mocks").delete().eq("id", mock.id);
    return { error: `Could not save extracted questions: ${questionsError.message}` };
  }

  redirect(`/teacher/review/${mock.id}`);
}

async function requireTeacher() {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") {
    throw new Error("Not authorized.");
  }
  return user;
}

/** Persists teacher edits to mock settings, batch assignment, and every question — without publishing. */
export async function saveMockDraft(
  mockId: string,
  payload: MockDraftPayload,
): Promise<{ error?: string }> {
  await requireTeacher();
  const admin = createAdminClient();

  const totalMarks = payload.questions.reduce((sum, q) => sum + q.marks, 0);

  const { error: mockError } = await admin
    .from("mocks")
    .update({
      mock_name: payload.mock_name,
      subject: payload.subject,
      time_limit_minutes: payload.time_limit_minutes,
      pass_percentage: payload.pass_percentage,
      total_questions: payload.questions.length,
      total_marks: totalMarks,
    })
    .eq("id", mockId);
  if (mockError) return { error: mockError.message };

  await admin.from("mock_batches").delete().eq("mock_id", mockId);
  if (payload.batches.length > 0) {
    const { error: batchError } = await admin
      .from("mock_batches")
      .insert(payload.batches.map((batch) => ({ mock_id: mockId, batch })));
    if (batchError) return { error: batchError.message };
  }

  const { data: existingRows } = await admin
    .from("questions")
    .select("id")
    .eq("mock_id", mockId);
  const existingIds = new Set((existingRows ?? []).map((r) => r.id));
  const keptIds = new Set(payload.questions.filter((q) => q.id).map((q) => q.id));
  const removedIds = [...existingIds].filter((id) => !keptIds.has(id));

  if (removedIds.length > 0) {
    await admin.from("questions").delete().in("id", removedIds);
  }

  for (const q of payload.questions) {
    const row = {
      mock_id: mockId,
      question_number: q.question_number,
      question_text: q.question_text,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_option: q.correct_option as OptionLetter,
      explanation: q.explanation,
      marks: q.marks,
    };
    if (q.id) {
      const { error } = await admin.from("questions").update(row).eq("id", q.id);
      if (error) return { error: error.message };
    } else {
      const { error } = await admin.from("questions").insert(row);
      if (error) return { error: error.message };
    }
  }

  revalidatePath(`/teacher/review/${mockId}`);
  return {};
}

export async function publishMock(mockId: string): Promise<{ error?: string }> {
  await requireTeacher();
  const admin = createAdminClient();

  const { count: batchCount } = await admin
    .from("mock_batches")
    .select("*", { count: "exact", head: true })
    .eq("mock_id", mockId);
  if (!batchCount) {
    return { error: "Assign at least one batch before publishing." };
  }

  const { count: questionCount } = await admin
    .from("questions")
    .select("*", { count: "exact", head: true })
    .eq("mock_id", mockId);
  if (!questionCount) {
    return { error: "This mock has no questions." };
  }

  const { error } = await admin.from("mocks").update({ status: "published" }).eq("id", mockId);
  if (error) return { error: error.message };

  revalidatePath("/teacher/dashboard");
  revalidatePath(`/teacher/review/${mockId}`);
  return {};
}

export async function archiveMock(mockId: string): Promise<{ error?: string }> {
  await requireTeacher();
  const admin = createAdminClient();
  const { error } = await admin.from("mocks").update({ status: "archived" }).eq("id", mockId);
  if (error) return { error: error.message };
  revalidatePath("/teacher/dashboard");
  return {};
}
