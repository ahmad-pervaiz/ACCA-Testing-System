import { AuthSplitLayout } from "@/components/shared/auth-split-layout";
import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <AuthSplitLayout
      eyebrow="Student Portal"
      headline="Where every mock brings exam day closer."
      subtext="Choose a new password for your account."
    >
      <div className="mb-6 rounded-lg border border-border bg-surface-muted px-4 py-2.5 text-center text-sm font-semibold text-foreground">
        Set a New Password
      </div>

      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <p className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">
          This reset link is missing its token. Request a new one from the login page.
        </p>
      )}
    </AuthSplitLayout>
  );
}
