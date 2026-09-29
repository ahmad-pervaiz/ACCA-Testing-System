"use client";

import Link from "next/link";
import { useActionState } from "react";
import { studentLogin, type AuthActionState } from "@/lib/actions/auth";
import { AuthSplitLayout, AuthTabs } from "@/components/shared/auth-split-layout";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const initialState: AuthActionState = {};

export default function StudentLoginPage() {
  const [state, formAction, pending] = useActionState(studentLogin, initialState);

  return (
    <AuthSplitLayout
      eyebrow="Student Portal"
      headline="Where every mock brings exam day closer."
      subtext="Sign in to pick up your assigned papers, track your results, and keep building toward a pass."
    >
      <AuthTabs active="login" />

      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" placeholder="you@gmail.com" required autoFocus />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/student/forgot-password" className="text-xs font-medium text-accent hover:underline">
              Forgot password?
            </Link>
          </div>
          <Input id="password" name="password" type="password" required />
        </div>

        {state.error && (
          <p className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">{state.error}</p>
        )}

        <Button type="submit" variant="accent" disabled={pending} className="mt-2">
          {pending ? "Signing in…" : "Login"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href="/teacher/login" className="font-medium text-accent hover:underline">
          Faculty login instead →
        </Link>
      </p>
    </AuthSplitLayout>
  );
}
