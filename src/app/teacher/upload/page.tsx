import { requireUser } from "@/lib/auth";
import { PortalShell } from "@/components/shared/portal-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UploadForm } from "./upload-form";

const TEACHER_LINKS = [
  { href: "/teacher/dashboard", label: "Dashboard" },
  { href: "/teacher/upload", label: "Upload Mock" },
  { href: "/teacher/results", label: "Results" },
];

export default async function UploadPage() {
  const user = await requireUser("teacher");

  return (
    <PortalShell user={user} tagline="Faculty Portal" links={TEACHER_LINKS}>
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Upload Mock Test</h1>
          <p className="text-sm text-muted-foreground">
            Upload a PDF test paper — Claude will read it and extract each question, its four
            options, the correct answer, and an explanation. You&apos;ll review and edit everything
            before it&apos;s published to students.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>PDF Mock Test</CardTitle>
            <CardDescription>Standard ACCA-style MCQ papers work best.</CardDescription>
          </CardHeader>
          <CardContent>
            <UploadForm />
          </CardContent>
        </Card>
      </div>
    </PortalShell>
  );
}
