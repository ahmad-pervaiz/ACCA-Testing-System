"use client";

import Link from "next/link";
import { useActionState } from "react";
import { studentLogin, type AuthActionState } from "@/lib/actions/auth";
import { BrandHeader } from "@/components/shared/brand-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BATCHES } from "@/lib/constants";

const initialState: AuthActionState = {};

export default function StudentLoginPage() {
  const [state, formAction, pending] = useActionState(studentLogin, initialState);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-16">
      <BrandHeader tagline="Student Portal" />

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Student Sign In</CardTitle>
          <CardDescription>
            Enter your name, RISE/ACCA Student ID, and batch — no password needed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="full_name">Full Name</Label>
              <Input id="full_name" name="full_name" placeholder="Jane Student" required autoFocus />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="acca_id">RISE/ACCA Student ID</Label>
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

            {state.error && (
              <p className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">{state.error}</p>
            )}

            <Button type="submit" disabled={pending} className="mt-2">
              {pending ? "Signing in…" : "Continue"}
            </Button>
          </form>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Use the same Student ID every time so your results are tracked correctly.
          </p>
        </CardContent>
      </Card>

      <Link href="/teacher/login" className="text-sm text-muted-foreground hover:underline">
        Faculty login instead →
      </Link>
    </main>
  );
}
