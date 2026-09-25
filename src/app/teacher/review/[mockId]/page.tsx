import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PortalShell } from "@/components/shared/portal-shell";
import { ReviewEditor } from "./review-editor";
import type { QuestionDraft } from "@/lib/types";

const TEACHER_LINKS = [
  { href: "/teacher/dashboard", label: "Dashboard" },
  { href: "/teacher/upload", label: "Upload Mock" },
  { href: "/teacher/results", label: "Results" },
];

export default async function ReviewMockPage({
  params,
}: {
  params: Promise<{ mockId: string }>;
}) {
  const { mockId } = await params;
  const user = await requireUser("teacher");
  const supabase = await createClient();

  const { data: mock } = await supabase.from("mocks").select("*").eq("id", mockId).single();
  if (!mock) notFound();

  const { data: questions } = await supabase
    .from("questions")
    .select("*")
    .eq("mock_id", mockId)
    .order("question_number", { ascending: true });

  const { data: batchRows } = await supabase
    .from("mock_batches")
    .select("batch")
    .eq("mock_id", mockId);

  const questionDrafts: QuestionDraft[] = (questions ?? []).map((q) => ({
    id: q.id,
    question_number: q.question_number,
    question_text: q.question_text,
    option_a: q.option_a,
    option_b: q.option_b,
    option_c: q.option_c,
    option_d: q.option_d,
    correct_option: q.correct_option,
    explanation: q.explanation ?? "",
    marks: q.marks,
  }));

  return (
    <PortalShell user={user} tagline="Faculty Portal" links={TEACHER_LINKS}>
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Review &amp; Edit Mock</h1>
          <p className="text-sm text-muted-foreground">
            Check the AI-extracted questions below, fix any mistakes, set the time limit and
            batches, then publish.
          </p>
        </div>

        <ReviewEditor
          mock={mock}
          initialQuestions={questionDrafts}
          initialBatches={(batchRows ?? []).map((b) => b.batch)}
        />
      </div>
    </PortalShell>
  );
}
