"use client";

import Link from "next/link";
import { useActionState } from "react";
import { teacherLogin, type AuthActionState } from "@/lib/actions/auth";
import { AuthSplitLayout } from "@/components/shared/auth-split-layout";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const initialState: AuthActionState = {};

export default function TeacherLoginPage() {
  const [state, formAction, pending] = useActionState(teacherLogin, initialState);

  return (
    <AuthSplitLayout
      eyebrow="Faculty Portal"
      headline="Set the standard your students practice against."
      subtext="Sign in to publish mocks, review submissions, and see results across every batch in one place."
    >
      <div className="mb-6 rounded-lg border border-border bg-surface-muted px-4 py-2.5 text-center text-sm font-semibold text-foreground">
        Faculty Login
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" placeholder="alipervaiz.ca269@gmail.com" required autoFocus />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" required />
        </div>

        {state.error && (
          <p className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">{state.error}</p>
        )}

        <Button type="submit" variant="accent" disabled={pending} className="mt-2">
          {pending ? "Signing in…" : "Login"}
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Single faculty account, configured in the server environment.
      </p>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        <Link href="/student/login" className="font-medium text-accent hover:underline">
          ← Student login instead
        </Link>
      </p>
    </AuthSplitLayout>
  );
}
