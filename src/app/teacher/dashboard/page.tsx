import type { ReactNode } from "react";
import Link from "next/link";
import { Upload, BarChart3, FileText, Users } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PortalShell } from "@/components/shared/portal-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

const TEACHER_LINKS = [
  { href: "/teacher/dashboard", label: "Dashboard" },
  { href: "/teacher/upload", label: "Upload Mock" },
  { href: "/teacher/results", label: "Results" },
];

export default async function TeacherDashboardPage() {
  const user = await requireUser("teacher");
  const supabase = await createClient();

  const { data: mocks } = await supabase
    .from("mocks")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(8);

  const { count: publishedCount } = await supabase
    .from("mocks")
    .select("*", { count: "exact", head: true })
    .eq("status", "published");

  const { count: draftCount } = await supabase
    .from("mocks")
    .select("*", { count: "exact", head: true })
    .eq("status", "draft");

  const { count: studentCount } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("role", "student");

  const { count: submissionCount } = await supabase
    .from("exam_results")
    .select("*", { count: "exact", head: true });

  return (
    <PortalShell user={user} tagline="Faculty Portal" links={TEACHER_LINKS}>
      <div className="flex flex-col gap-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold text-foreground">Faculty Dashboard</h1>
          <Link href="/teacher/upload">
            <Button>
              <Upload className="h-4 w-4" /> Upload New Mock
            </Button>
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={<FileText className="h-5 w-5" />} label="Published Mocks" value={publishedCount ?? 0} />
          <StatCard icon={<FileText className="h-5 w-5" />} label="Drafts Pending Review" value={draftCount ?? 0} />
          <StatCard icon={<Users className="h-5 w-5" />} label="Registered Students" value={studentCount ?? 0} />
          <StatCard icon={<BarChart3 className="h-5 w-5" />} label="Total Submissions" value={submissionCount ?? 0} />
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
                  {(mocks ?? []).length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">
                        No mocks uploaded yet.
                      </td>
                    </tr>
                  )}
                  {(mocks ?? []).map((m) => (
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
