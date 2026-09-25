import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import * as sheets from "@/lib/sheets";
import { PortalShell } from "@/components/shared/portal-shell";
import { ReviewEditor } from "./review-editor";

const TEACHER_LINKS = [
  { href: "/teacher/dashboard", label: "Dashboard" },
  { href: "/teacher/create-mock", label: "Create Mock" },
  { href: "/teacher/results", label: "Results" },
];

export default async function ReviewMockPage({
  params,
}: {
  params: Promise<{ mockId: string }>;
}) {
  const { mockId } = await params;
  const user = await requireUser("teacher");

  const mock = await sheets.getMockForEdit(mockId).catch(() => null);
  if (!mock) notFound();

  return (
    <PortalShell user={user} tagline="Faculty Portal" links={TEACHER_LINKS}>
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Review &amp; Edit Mock</h1>
          <p className="text-sm text-muted-foreground">
            Check the questions below, fix any mistakes, set the time limit and batches, then
            publish.
          </p>
        </div>

        <ReviewEditor mock={mock} initialQuestions={mock.questions} initialBatches={mock.batches} />
      </div>
    </PortalShell>
  );
}
