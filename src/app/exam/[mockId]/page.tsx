import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import { AlertTriangle, Clock, FileQuestion, Award } from "lucide-react";
import { requireUser } from "@/lib/auth";
import * as sheets from "@/lib/sheets";
import { beginExam } from "@/lib/actions/exam";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SCHOOL_NAME } from "@/lib/constants";

export default async function PreExamPage({
  params,
}: {
  params: Promise<{ mockId: string }>;
}) {
  const { mockId } = await params;
  const user = await requireUser("student");
  if (user.role !== "student") return null;

  const mock = await sheets.orNull(sheets.getMockMeta(mockId), "Mock not found.");
  if (!mock || mock.status !== "published") notFound();
  if (!mock.batches.includes(user.batch)) redirect("/student/dashboard");

  const existingResult = await sheets.getResult(mockId, user.acca_id);
  if (existingResult) redirect(`/exam/${mockId}/result`);

  const existingSession = await sheets.getSession(mockId, user.acca_id);

  const beginExamWithId = beginExam.bind(null, mockId);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-16">
      <div className="flex flex-col items-center gap-3 text-center">
        <Image
          src="/branding/logo.jpeg"
          alt={`${SCHOOL_NAME} logo`}
          width={64}
          height={64}
          className="rounded-xl object-cover"
        />
        <p className="text-sm font-medium text-muted-foreground">{SCHOOL_NAME}</p>
      </div>

      <Card className="w-full max-w-xl">
        <CardHeader>
          <p className="text-xs font-medium uppercase tracking-wide text-brand">{mock.subject}</p>
          <CardTitle className="text-2xl">{mock.mock_name}</CardTitle>
          <p className="text-sm text-muted-foreground">Set by {mock.teacher_name}</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="grid grid-cols-3 gap-3 text-center">
            <Stat icon={<FileQuestion className="h-5 w-5" />} label="Questions" value={String(mock.total_questions)} />
            <Stat icon={<Award className="h-5 w-5" />} label="Total Marks" value={String(mock.total_marks)} />
            <Stat icon={<Clock className="h-5 w-5" />} label="Time Limit" value={`${mock.time_limit_minutes} min`} />
          </div>

          <div className="rounded-lg border border-warning-bg bg-warning-bg p-4">
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-warning">
              <AlertTriangle className="h-4 w-4" /> Exam Rules
            </p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
              <li>The timer starts the moment you click &quot;Start Exam&quot; and cannot be paused.</li>
              <li>Your answers save automatically as you work — refreshing the page will not lose progress.</li>
              <li>The exam auto-submits when the timer reaches 00:00:00.</li>
              <li>You may flag questions for review and revisit them before submitting.</li>
              <li>Pass mark is {mock.pass_percentage}%. You can attempt this mock only once.</li>
            </ul>
          </div>

          <form action={beginExamWithId}>
            <Button type="submit" size="lg" className="w-full">
              {existingSession ? "Resume Exam" : "Start Exam"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg bg-surface-muted p-3">
      <div className="text-brand">{icon}</div>
      <p className="text-lg font-semibold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
