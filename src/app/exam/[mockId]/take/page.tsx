import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ExamRoom } from "./exam-room";
import type { ExamQuestion } from "@/lib/types";

export default async function TakeExamPage({
  params,
}: {
  params: Promise<{ mockId: string }>;
}) {
  const { mockId } = await params;
  const user = await requireUser("student");
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
    .select("*")
    .eq("mock_id", mockId)
    .eq("student_id", user.id)
    .maybeSingle();
  if (!session) redirect(`/exam/${mockId}`);

  const { data: mock } = await admin.from("mocks").select("*").eq("id", mockId).single();
  if (!mock) notFound();

  // Answer key is deliberately never selected here — only fields safe to
  // show a student mid-exam are fetched.
  const { data: questions } = await admin
    .from("questions")
    .select(
      "id, mock_id, question_number, question_text, image_url, option_a, option_b, option_c, option_d, marks",
    )
    .eq("mock_id", mockId)
    .order("question_number", { ascending: true });

  return (
    <ExamRoom
      mock={mock}
      questions={(questions ?? []) as ExamQuestion[]}
      session={session}
    />
  );
}
