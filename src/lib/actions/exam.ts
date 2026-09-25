"use server";

import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { scoreExam } from "@/lib/scoring";
import type { ExamSession, OptionLetter } from "@/lib/types";

async function requireStudent() {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") redirect("/student/login");
  return user;
}

/** Creates the exam_sessions row (anchoring the deadline) if this is the first visit, then sends the student to the live exam. */
export async function beginExam(mockId: string): Promise<void> {
  const user = await requireStudent();
  const admin = createAdminClient();

  const { data: existingResult } = await admin
    .from("exam_results")
    .select("id")
    .eq("mock_id", mockId)
    .eq("student_id", user.id)
    .maybeSingle();
  if (existingResult) redirect(`/exam/${mockId}/result`);

  const { data: session } = await admin
    .from("exam_sessions")
    .select("id")
    .eq("mock_id", mockId)
    .eq("student_id", user.id)
    .maybeSingle();

  if (!session) {
    const { data: mock } = await admin
      .from("mocks")
      .select("time_limit_minutes, status")
      .eq("id", mockId)
      .single();
    if (!mock || mock.status !== "published") notFound();

    const deadline = new Date(Date.now() + mock.time_limit_minutes * 60_000).toISOString();
    await admin
      .from("exam_sessions")
      .insert({ mock_id: mockId, student_id: user.id, deadline_at: deadline });
  }

  redirect(`/exam/${mockId}/take`);
}

export async function getSessionState(mockId: string): Promise<ExamSession> {
  const user = await requireStudent();
  const admin = createAdminClient();
  const { data: session } = await admin
    .from("exam_sessions")
    .select("*")
    .eq("mock_id", mockId)
    .eq("student_id", user.id)
    .single();
  if (!session) redirect(`/exam/${mockId}`);
  return session as ExamSession;
}

/** Debounced autosave from the client while the student works. Never trust the client's clock for grading — only for display. */
export async function saveProgress(
  mockId: string,
  responses: Record<string, OptionLetter>,
  flagged: number[],
  currentQuestion: number,
): Promise<{ ok: boolean }> {
  const user = await requireStudent();
  const admin = createAdminClient();
  await admin
    .from("exam_sessions")
    .update({ responses, flagged, current_question: currentQuestion })
    .eq("mock_id", mockId)
    .eq("student_id", user.id)
    .eq("submitted", false);
  return { ok: true };
}

export async function submitExam(
  mockId: string,
  responses: Record<string, OptionLetter>,
): Promise<void> {
  const user = await requireStudent();
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("exam_results")
    .select("id")
    .eq("mock_id", mockId)
    .eq("student_id", user.id)
    .maybeSingle();
  if (existing) redirect(`/exam/${mockId}/result`);

  const { data: session } = await admin
    .from("exam_sessions")
    .select("*")
    .eq("mock_id", mockId)
    .eq("student_id", user.id)
    .single();
  if (!session) redirect(`/exam/${mockId}`);

  const { data: questions } = await admin
    .from("questions")
    .select("question_number, correct_option, marks")
    .eq("mock_id", mockId);

  const breakdown = scoreExam(questions ?? [], responses);
  const timeTakenSeconds = Math.max(
    0,
    Math.round((Date.now() - new Date(session.started_at).getTime()) / 1000),
  );

  await admin.from("exam_results").insert({
    mock_id: mockId,
    student_id: user.id,
    student_name: user.full_name,
    acca_id: user.acca_id,
    batch: user.batch,
    marks_obtained: breakdown.marksObtained,
    total_marks: breakdown.totalMarks,
    percentage: breakdown.percentage,
    correct_count: breakdown.correctCount,
    incorrect_count: breakdown.incorrectCount,
    unattempted_count: breakdown.unattemptedCount,
    time_taken_seconds: timeTakenSeconds,
    student_responses: responses,
  });

  await admin
    .from("exam_sessions")
    .update({ submitted: true, responses })
    .eq("mock_id", mockId)
    .eq("student_id", user.id);

  redirect(`/exam/${mockId}/result`);
}
