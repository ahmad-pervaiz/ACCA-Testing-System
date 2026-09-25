"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import * as sheets from "@/lib/sheets";
import type { OptionLetter } from "@/lib/types";

async function requireStudent() {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") redirect("/student/login");
  return user;
}

/** Creates the exam session (anchoring the deadline) if this is the first visit, then sends the student to the live exam. */
export async function beginExam(mockId: string): Promise<void> {
  const user = await requireStudent();

  const existingResult = await sheets.getResult(mockId, user.acca_id);
  if (existingResult) redirect(`/exam/${mockId}/result`);

  await sheets.beginExam({
    mockId,
    accaId: user.acca_id,
    studentName: user.full_name,
    batch: user.batch,
  });

  redirect(`/exam/${mockId}/take`);
}

/** Debounced autosave from the client while the student works. */
export async function saveProgress(
  mockId: string,
  responses: Record<string, OptionLetter>,
  flagged: number[],
  currentQuestion: number,
): Promise<{ ok: boolean }> {
  const user = await requireStudent();
  try {
    return await sheets.saveProgress({
      mockId,
      accaId: user.acca_id,
      responses,
      flagged,
      currentQuestion,
    });
  } catch {
    return { ok: false };
  }
}

export async function submitExam(
  mockId: string,
  responses: Record<string, OptionLetter>,
): Promise<void> {
  const user = await requireStudent();

  await sheets.submitExam({
    mockId,
    accaId: user.acca_id,
    studentName: user.full_name,
    batch: user.batch,
    responses,
  });

  redirect(`/exam/${mockId}/result`);
}
