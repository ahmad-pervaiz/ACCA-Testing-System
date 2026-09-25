import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PortalShell } from "@/components/shared/portal-shell";
import { ResultsTable } from "./results-table";

const TEACHER_LINKS = [
  { href: "/teacher/dashboard", label: "Dashboard" },
  { href: "/teacher/upload", label: "Upload Mock" },
  { href: "/teacher/results", label: "Results" },
];

export default async function TeacherResultsPage() {
  const user = await requireUser("teacher");
  const supabase = await createClient();

  const [{ data: results }, { data: mocks }] = await Promise.all([
    supabase.from("exam_results").select("*").order("submission_time", { ascending: false }),
    supabase.from("mocks").select("*").order("mock_name", { ascending: true }),
  ]);

  return (
    <PortalShell user={user} tagline="Faculty Portal" links={TEACHER_LINKS}>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Results — All Mocks, All Students</h1>
          <p className="text-sm text-muted-foreground">
            Filter by mock or batch, search by name/ID, sort, and export to CSV for the gradebook.
          </p>
        </div>
        <ResultsTable results={results ?? []} mocks={mocks ?? []} />
      </div>
    </PortalShell>
  );
}
