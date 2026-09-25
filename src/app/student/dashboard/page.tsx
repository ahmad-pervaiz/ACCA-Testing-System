import Link from "next/link";
import { ClipboardList, CheckCircle2, Clock } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PortalShell } from "@/components/shared/portal-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, percentOf } from "@/lib/utils";
import type { Mock, ExamResult } from "@/lib/types";

export default async function StudentDashboardPage() {
  const user = await requireUser("student");
  const supabase = await createClient();

  const { data: batchMockIds } = await supabase
    .from("mock_batches")
    .select("mock_id")
    .eq("batch", user.batch ?? "");

  const mockIds = (batchMockIds ?? []).map((r) => r.mock_id);

  const { data: mocks } = mockIds.length
    ? await supabase
        .from("mocks")
        .select("*")
        .eq("status", "published")
        .in("id", mockIds)
        .order("created_at", { ascending: false })
    : { data: [] as Mock[] };

  const { data: results } = await supabase
    .from("exam_results")
    .select("*")
    .eq("student_id", user.id)
    .order("submission_time", { ascending: false });

  const resultsByMock = new Map((results ?? []).map((r) => [r.mock_id, r as ExamResult]));
  const available = (mocks ?? []).filter((m) => !resultsByMock.has(m.id));
  const completed = (mocks ?? []).filter((m) => resultsByMock.has(m.id));

  return (
    <PortalShell
      user={user}
      tagline="Student Portal"
      links={[{ href: "/student/dashboard", label: "Dashboard" }]}
    >
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Welcome, {user.full_name.split(" ")[0]}</h1>
          <p className="text-sm text-muted-foreground">{user.batch}</p>
        </div>

        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-foreground">
            <ClipboardList className="h-5 w-5 text-brand" /> Available Mock Tests
          </h2>
          {available.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No mock tests are currently assigned to your batch. Check back soon.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {available.map((mock: Mock) => (
                <Card key={mock.id}>
                  <CardHeader>
                    <Badge variant="brand" className="w-fit">
                      {mock.subject}
                    </Badge>
                    <CardTitle>{mock.mock_name}</CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> {mock.time_limit_minutes} min &middot;{" "}
                      {mock.total_questions} questions &middot; {mock.total_marks} marks
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link href={`/exam/${mock.id}`}>
                      <Button className="w-full">Start Exam</Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-foreground">
            <CheckCircle2 className="h-5 w-5 text-success" /> Past Results
          </h2>
          {completed.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                You haven&apos;t completed any mock tests yet.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="px-5 py-3 font-medium">Mock</th>
                      <th className="px-5 py-3 font-medium">Score</th>
                      <th className="px-5 py-3 font-medium">Percentage</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                      <th className="px-5 py-3 font-medium">Submitted</th>
                      <th className="px-5 py-3 font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {completed.map((mock: Mock) => {
                      const r = resultsByMock.get(mock.id)!;
                      const pass = percentOf(r.marks_obtained, r.total_marks) >= mock.pass_percentage;
                      return (
                        <tr key={mock.id} className="border-b border-border last:border-0">
                          <td className="px-5 py-3 font-medium text-foreground">{mock.mock_name}</td>
                          <td className="px-5 py-3">
                            {r.marks_obtained}/{r.total_marks}
                          </td>
                          <td className="px-5 py-3">{r.percentage}%</td>
                          <td className="px-5 py-3">
                            <Badge variant={pass ? "success" : "danger"}>{pass ? "Pass" : "Fail"}</Badge>
                          </td>
                          <td className="px-5 py-3 text-muted-foreground">{formatDate(r.submission_time)}</td>
                          <td className="px-5 py-3 text-right">
                            <Link
                              href={`/exam/${mock.id}/result`}
                              className="font-medium text-brand hover:underline"
                            >
                              Review
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </section>
      </div>
    </PortalShell>
  );
}
