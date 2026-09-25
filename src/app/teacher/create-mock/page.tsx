import { requireUser } from "@/lib/auth";
import { PortalShell } from "@/components/shared/portal-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateMockForm } from "./create-mock-form";

const TEACHER_LINKS = [
  { href: "/teacher/dashboard", label: "Dashboard" },
  { href: "/teacher/create-mock", label: "Create Mock" },
  { href: "/teacher/results", label: "Results" },
];

export default async function CreateMockPage() {
  const user = await requireUser("teacher");

  return (
    <PortalShell user={user} tagline="Faculty Portal" links={TEACHER_LINKS}>
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Create Mock Test</h1>
          <p className="text-sm text-muted-foreground">
            Upload or paste a JSON mock exam. Once it validates, you&apos;ll assign it to
            batches and publish it from the review screen.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Mock JSON</CardTitle>
            <CardDescription>
              Root fields: mock_name, subject, time_limit_minutes, pass_percentage, and a
              questions array (question_number, question_text, option_a–d, correct_option,
              explanation, marks).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateMockForm />
          </CardContent>
        </Card>
      </div>
    </PortalShell>
  );
}
