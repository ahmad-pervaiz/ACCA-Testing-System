"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import * as sheets from "@/lib/sheets";
import { DEFAULT_PASS_PERCENTAGE, DEFAULT_TIME_LIMIT_MINUTES, TEACHER_NAME } from "@/lib/constants";
import type { MockDraftPayload, MockJsonInput } from "@/lib/types";

async function requireTeacher() {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") {
    throw new Error("Not authorized.");
  }
  return user;
}

/** Creates a draft mock from teacher-supplied JSON (already schema-validated client-side). */
export async function createMockFromJson(
  input: MockJsonInput,
): Promise<{ id?: string; error?: string }> {
  await requireTeacher();
  try {
    const totalMarks = input.questions.reduce((sum, q) => sum + q.marks, 0);
    const { id } = await sheets.createDraftMock({
      mock_name: input.mock_name,
      subject: input.subject,
      teacher_name: input.teacher_name || TEACHER_NAME,
      time_limit_minutes: input.time_limit_minutes || DEFAULT_TIME_LIMIT_MINUTES,
      total_marks: input.total_marks ?? totalMarks,
      pass_percentage: input.pass_percentage || DEFAULT_PASS_PERCENTAGE,
      questions: input.questions,
    });
    return { id };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not create mock." };
  }
}

/** Persists teacher edits to mock settings, batch assignment, and every question — without publishing. */
export async function saveMockDraft(
  mockId: string,
  payload: MockDraftPayload,
): Promise<{ error?: string }> {
  await requireTeacher();
  try {
    await sheets.updateMock(mockId, payload);
    revalidatePath(`/teacher/review/${mockId}`);
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not save changes." };
  }
}

export async function publishMock(mockId: string): Promise<{ error?: string }> {
  await requireTeacher();
  try {
    await sheets.publishMock(mockId);
    revalidatePath("/teacher/dashboard");
    revalidatePath(`/teacher/review/${mockId}`);
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not publish." };
  }
}

export async function archiveMock(mockId: string): Promise<{ error?: string }> {
  await requireTeacher();
  try {
    await sheets.archiveMock(mockId);
    revalidatePath("/teacher/dashboard");
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not archive." };
  }
}
