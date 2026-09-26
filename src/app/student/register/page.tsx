"use client";

import Link from "next/link";
import { useActionState } from "react";
import { studentRegister, type AuthActionState } from "@/lib/actions/auth";
import { BrandHeader } from "@/components/shared/brand-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BATCHES } from "@/lib/constants";

const initialState: AuthActionState = {};

export default function StudentRegisterPage() {
  const [state, formAction, pending] = useActionState(studentRegister, initialState);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-16">
      <BrandHeader tagline="Student Portal" />

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Create Student Account</CardTitle>
          <CardDescription>
            RISE doesn&apos;t issue a school email, so use any email you check
            regularly — it&apos;s only used to recover your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="full_name">Full Name</Label>
              <Input id="full_name" name="full_name" placeholder="Jane Student" required autoFocus />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="jane@gmail.com" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="acca_id">RISE/ACCA ID</Label>
              <Input id="acca_id" name="acca_id" placeholder="RISE-2026-0001" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="batch">Batch</Label>
              <Select id="batch" name="batch" required defaultValue="">
                <option value="" disabled>
                  Select your batch
                </option>
                {BATCHES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" minLength={8} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirm_password">Confirm Password</Label>
              <Input id="confirm_password" name="confirm_password" type="password" minLength={8} required />
            </div>

            {state.error && (
              <p className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">{state.error}</p>
            )}

            <Button type="submit" disabled={pending} className="mt-2">
              {pending ? "Creating account…" : "Create Account"}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already registered?{" "}
            <Link href="/student/login" className="font-medium text-brand hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
