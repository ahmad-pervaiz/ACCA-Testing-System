import { BrandHeader } from "@/components/shared/brand-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-16">
      <BrandHeader tagline="Student Portal" />

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Set a New Password</CardTitle>
          <CardDescription>Choose a new password for your account.</CardDescription>
        </CardHeader>
        <CardContent>
          {token ? (
            <ResetPasswordForm token={token} />
          ) : (
            <p className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">
              This reset link is missing its token. Request a new one from the login page.
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
