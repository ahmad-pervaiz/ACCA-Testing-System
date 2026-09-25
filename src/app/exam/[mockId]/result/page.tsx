import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, XCircle, MinusCircle, Trophy, Clock, Target } from "lucide-react";
import { requireUser } from "@/lib/auth";
import * as sheets from "@/lib/sheets";
import { PortalShell } from "@/components/shared/portal-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatDuration, cn } from "@/lib/utils";
import type { OptionLetter } from "@/lib/types";

export default async function ExamResultPage({
  params,
}: {
  params: Promise<{ mockId: string }>;
}) {
  const { mockId } = await params;
  const user = await requireUser("student");
  if (user.role !== "student") return null;

  const result = await sheets.getResult(mockId, user.acca_id);
  if (!result) redirect(`/exam/${mockId}`);

  const mock = await sheets.getMockForReview(mockId, user.acca_id).catch(() => null);
  if (!mock) notFound();

  const responses = result.student_responses;
  const passPercentage = mock.pass_percentage;
  const pass = result.percentage >= passPercentage;

  return (
    <PortalShell
      user={user}
      tagline="Student Portal"
      links={[{ href: "/student/dashboard", label: "Dashboard" }]}
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <Card className={cn("border-2", pass ? "border-success" : "border-danger")}>
          <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
            <Trophy className={cn("h-10 w-10", pass ? "text-success" : "text-danger")} />
            <div>
              <p className="text-sm text-muted-foreground">{mock.mock_name}</p>
              <p className="text-4xl font-bold text-foreground">
                {result.marks_obtained}/{result.total_marks}
              </p>
              <p className="text-lg font-medium text-muted-foreground">{result.percentage}%</p>
            </div>
            <Badge variant={pass ? "success" : "danger"} className="px-4 py-1 text-sm">
              {pass ? "PASS" : "FAIL"} &middot; Pass mark {passPercentage}%
            </Badge>

            <div className="mt-2 grid w-full grid-cols-3 gap-3 border-t border-border pt-4">
              <MiniStat icon={<CheckCircle2 className="h-4 w-4 text-success" />} label="Correct" value={result.correct_count} />
              <MiniStat icon={<XCircle className="h-4 w-4 text-danger" />} label="Incorrect" value={result.incorrect_count} />
              <MiniStat icon={<MinusCircle className="h-4 w-4 text-muted-foreground" />} label="Unattempted" value={result.unattempted_count} />
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> Time taken: {formatDuration(result.time_taken_seconds)}
              </span>
              <span className="flex items-center gap-1">
                <Target className="h-3.5 w-3.5" /> Submitted {formatDate(result.submission_time)}
              </span>
            </div>
          </CardContent>
        </Card>

        <div>
          <h2 className="mb-3 text-lg font-semibold text-foreground">Itemized Review</h2>
          <div className="flex flex-col gap-3">
            {mock.questions.map((q) => {
              const given = responses[String(q.question_number)] ?? null;
              const isCorrect = given === q.correct_option;
              return (
                <Card key={q.question_number} className={cn(given === null && "opacity-90")}>
                  <CardContent className="flex flex-col gap-3 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium text-foreground">
                        {q.question_number}. {q.question_text}
                      </p>
                      <Badge variant={given === null ? "neutral" : isCorrect ? "success" : "danger"}>
                        {given === null ? "Unattempted" : isCorrect ? "Correct" : "Incorrect"}
                      </Badge>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      {(["A", "B", "C", "D"] as OptionLetter[]).map((letter) => {
                        const text = q[`option_${letter.toLowerCase()}` as "option_a"];
                        const isCorrectOption = letter === q.correct_option;
                        const isGiven = letter === given;
                        return (
                          <div
                            key={letter}
                            className={cn(
                              "flex items-center gap-2 rounded-md border px-3 py-2 text-sm",
                              isCorrectOption && "border-success bg-success-bg text-success",
                              isGiven && !isCorrectOption && "border-danger bg-danger-bg text-danger",
                              !isCorrectOption && !isGiven && "border-border text-muted-foreground",
                            )}
                          >
                            <span className="font-semibold">{letter}.</span> {text}
                            {isGiven && <span className="ml-auto text-xs">Your answer</span>}
                            {isCorrectOption && !isGiven && <span className="ml-auto text-xs">Correct</span>}
                          </div>
                        );
                      })}
                    </div>

                    {q.explanation && (
                      <p className="rounded-md bg-info-bg px-3 py-2 text-sm text-info">
                        <span className="font-semibold">Explanation: </span>
                        {q.explanation}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <Link href="/student/dashboard" className="text-center text-sm font-medium text-brand hover:underline">
          ← Back to Dashboard
        </Link>
      </div>
    </PortalShell>
  );
}

function MiniStat({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-1 text-sm font-semibold text-foreground">
        {icon} {value}
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
