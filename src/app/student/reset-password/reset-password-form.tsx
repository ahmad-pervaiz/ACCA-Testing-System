"use client";

import Link from "next/link";
import { useActionState } from "react";
import { resetPassword, type AuthActionState } from "@/lib/actions/auth";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const initialState: AuthActionState = {};

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(resetPassword, initialState);

  return (
    <>
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="token" value={token} />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">New Password</Label>
          <Input id="password" name="password" type="password" minLength={8} required autoFocus />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirm_password">Confirm New Password</Label>
          <Input id="confirm_password" name="confirm_password" type="password" minLength={8} required />
        </div>

        {state.error && (
          <p className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">{state.error}</p>
        )}

        <Button type="submit" disabled={pending || !token} className="mt-2">
          {pending ? "Resetting…" : "Reset Password"}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        <Link href="/student/login" className="font-medium text-brand hover:underline">
          Back to sign in
        </Link>
      </p>
    </>
  );
}
