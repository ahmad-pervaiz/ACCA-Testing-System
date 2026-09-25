"use client";

import Link from "next/link";
import { useActionState } from "react";
import { teacherLogin, type AuthActionState } from "@/lib/actions/auth";
import { BrandHeader } from "@/components/shared/brand-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const initialState: AuthActionState = {};

export default function TeacherLoginPage() {
  const [state, formAction, pending] = useActionState(teacherLogin, initialState);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-16">
      <BrandHeader tagline="Faculty Portal" />

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Faculty Login</CardTitle>
          <CardDescription>Sign in with your registered faculty email.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="ali.pervaiz@riseacademy.edu.pk" required autoFocus />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required />
            </div>

            {state.error && (
              <p className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">{state.error}</p>
            )}

            <Button type="submit" disabled={pending} className="mt-2">
              {pending ? "Signing in…" : "Sign In"}
            </Button>
          </form>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Faculty accounts are provisioned by the school administrator.
          </p>
        </CardContent>
      </Card>

      <Link href="/student/login" className="text-sm text-muted-foreground hover:underline">
        ← Student login instead
      </Link>
    </main>
  );
}
