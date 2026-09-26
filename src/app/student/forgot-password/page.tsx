"use client";

import Link from "next/link";
import { useActionState } from "react";
import { MailCheck } from "lucide-react";
import { forgotPassword, type ForgotPasswordState } from "@/lib/actions/auth";
import { BrandHeader } from "@/components/shared/brand-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const initialState: ForgotPasswordState = {};

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(forgotPassword, initialState);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-16">
      <BrandHeader tagline="Student Portal" />

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Reset Your Password</CardTitle>
          <CardDescription>
            Enter the email you registered with — we&apos;ll send a link to set a new password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {state.sent ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <MailCheck className="h-10 w-10 text-success" />
              <p className="text-sm text-foreground">
                If that email is registered, a reset link is on its way. Check your inbox (and
                spam folder) — the link expires in 60 minutes.
              </p>
            </div>
          ) : (
            <form action={formAction} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" placeholder="you@gmail.com" required autoFocus />
              </div>

              {state.error && (
                <p className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">{state.error}</p>
              )}

              <Button type="submit" disabled={pending} className="mt-2">
                {pending ? "Sending…" : "Send Reset Link"}
              </Button>
            </form>
          )}

          <p className="mt-4 text-center text-sm text-muted-foreground">
            <Link href="/student/login" className="font-medium text-brand hover:underline">
              Back to sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
