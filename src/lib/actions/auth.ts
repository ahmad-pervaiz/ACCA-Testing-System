"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { signSession, verifySession } from "@/lib/session";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  TEACHER_EMAIL,
  TEACHER_NAME,
} from "@/lib/constants";

export interface AuthActionState {
  error?: string;
}

async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });
}

/**
 * Single-admin login: there is no teacher database row, just one email
 * fixed at build time (TEACHER_EMAIL) checked against a server-only
 * password (TEACHER_PASSWORD, never sent to the browser). This is the
 * closest zero-cost equivalent to Supabase Auth for exactly one account.
 */
export async function teacherLogin(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const expectedPassword = process.env.TEACHER_PASSWORD;
  if (!expectedPassword) {
    return { error: "Server is missing TEACHER_PASSWORD — set it in .env.local." };
  }
  if (email !== TEACHER_EMAIL || password !== expectedPassword) {
    return { error: "Invalid email or password." };
  }

  await setSessionCookie(signSession({ role: "teacher", email: TEACHER_EMAIL, full_name: TEACHER_NAME }));
  redirect("/teacher/dashboard");
}

/**
 * Students identify with Name + RISE/ACCA Student ID + Batch — no password.
 * There is no student database to check against; the signed cookie is what
 * proxy.ts and every Server Action trust afterwards.
 */
export async function studentLogin(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const fullName = String(formData.get("full_name") || "").trim();
  const accaId = String(formData.get("acca_id") || "").trim();
  const batch = String(formData.get("batch") || "").trim();

  if (!fullName || !accaId || !batch) {
    return { error: "Enter your name, Student ID, and batch." };
  }

  await setSessionCookie(signSession({ role: "student", full_name: fullName, acca_id: accaId, batch }));
  redirect("/student/dashboard");
}

export async function logout(): Promise<void> {
  const jar = await cookies();
  const current = verifySession(jar.get(SESSION_COOKIE_NAME)?.value);
  jar.delete(SESSION_COOKIE_NAME);
  redirect(current?.role === "teacher" ? "/teacher/login" : "/student/login");
}
