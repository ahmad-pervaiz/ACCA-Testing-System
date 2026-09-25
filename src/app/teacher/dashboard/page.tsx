import type { ReactNode } from "react";
import Link from "next/link";
import { Upload, BarChart3, FileText, Users } from "lucide-react";
import { requireUser } from "@/lib/auth";
import * as sheets from "@/lib/sheets";
import { PortalShell } from "@/components/shared/portal-shell";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

const TEACHER_LINKS = [
  { href: "/teacher/dashboard", label: "Dashboard" },
  { href: "/teacher/create-mock", label: "Create Mock" },
  { href: "/teacher/results", label: "Results" },
];

export default async function TeacherDashboardPage() {
  const user = await requireUser("teacher");

  const [mocks, results] = await Promise.all([
    sheets.listAllMocksForTeacher(),
    sheets.listResultsForTeacher(),
  ]);

  const publishedCount = mocks.filter((m) => m.status === "published").length;
  const draftCount = mocks.filter((m) => m.status === "draft").length;
  const studentCount = new Set(results.map((r) => r.acca_id)).size;
  const recent = [...mocks]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8);

  return (
    <PortalShell user={user} tagline="Faculty Portal" links={TEACHER_LINKS}>
      <div className="flex flex-col gap-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold text-foreground">Faculty Dashboard</h1>
          <Link href="/teacher/create-mock">
            <Button>
              <Upload className="h-4 w-4" /> Create New Mock
            </Button>
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={<FileText className="h-5 w-5" />} label="Published Mocks" value={publishedCount} />
          <StatCard icon={<FileText className="h-5 w-5" />} label="Drafts Pending Review" value={draftCount} />
          <StatCard icon={<Users className="h-5 w-5" />} label="Students With Results" value={studentCount} />
          <StatCard icon={<BarChart3 className="h-5 w-5" />} label="Total Submissions" value={results.length} />
        </div>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Recent Mocks</h2>
            <Link href="/teacher/results" className="text-sm font-medium text-brand hover:underline">
              View all results →
            </Link>
          </div>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="px-5 py-3 font-medium">Mock Name</th>
                    <th className="px-5 py-3 font-medium">Subject</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Created</th>
                    <th className="px-5 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {recent.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">
                        No mocks created yet.
                      </td>
                    </tr>
                  )}
                  {recent.map((m) => (
                    <tr key={m.id} className="border-b border-border last:border-0">
                      <td className="px-5 py-3 font-medium text-foreground">{m.mock_name}</td>
                      <td className="px-5 py-3">{m.subject}</td>
                      <td className="px-5 py-3">
                        <Badge variant={m.status === "published" ? "success" : "warning"}>
                          {m.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{formatDate(m.created_at)}</td>
                      <td className="px-5 py-3 text-right">
                        <Link href={`/teacher/review/${m.id}`} className="font-medium text-brand hover:underline">
                          {m.status === "draft" ? "Review & Publish" : "Edit"}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </section>
      </div>
    </PortalShell>
  );
}

function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-light text-brand">
          {icon}
        </div>
        <div>
          <CardDescription>{label}</CardDescription>
          <CardTitle className="text-2xl">{value}</CardTitle>
        </div>
      </CardHeader>
    </Card>
  );
}
