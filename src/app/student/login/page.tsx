"use client";

import Link from "next/link";
import { useActionState } from "react";
import { studentLogin, type AuthActionState } from "@/lib/actions/auth";
import { BrandHeader } from "@/components/shared/brand-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const initialState: AuthActionState = {};

export default function StudentLoginPage() {
  const [state, formAction, pending] = useActionState(studentLogin, initialState);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-16">
      <BrandHeader tagline="Student Portal" />

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Student Login</CardTitle>
          <CardDescription>Sign in with your email and password.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="you@gmail.com" required autoFocus />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link href="/student/forgot-password" className="text-xs font-medium text-brand hover:underline">
                  Forgot password?
                </Link>
              </div>
              <Input id="password" name="password" type="password" required />
            </div>

            {state.error && (
              <p className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">{state.error}</p>
            )}

            <Button type="submit" disabled={pending} className="mt-2">
              {pending ? "Signing in…" : "Sign In"}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            New here?{" "}
            <Link href="/student/register" className="font-medium text-brand hover:underline">
              Create an account
            </Link>
          </p>
        </CardContent>
      </Card>

      <Link href="/teacher/login" className="text-sm text-muted-foreground hover:underline">
        Faculty login instead →
      </Link>
    </main>
  );
}
