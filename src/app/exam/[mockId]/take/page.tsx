import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import * as sheets from "@/lib/sheets";
import { ExamRoom } from "./exam-room";

export default async function TakeExamPage({
  params,
}: {
  params: Promise<{ mockId: string }>;
}) {
  const { mockId } = await params;
  const user = await requireUser("student");
  if (user.role !== "student") return null;

  const existingResult = await sheets.getResult(mockId, user.acca_id);
  if (existingResult) redirect(`/exam/${mockId}/result`);

  const session = await sheets.getSession(mockId, user.acca_id);
  if (!session) redirect(`/exam/${mockId}`);

  // Answer key is deliberately never fetched here — getMockForExam strips
  // correct_option/explanation server-side in Code.gs before this ever runs.
  const mock = await sheets.getMockForExam(mockId).catch(() => null);
  if (!mock) notFound();

  return <ExamRoom mock={mock} questions={mock.questions} session={session} />;
}
