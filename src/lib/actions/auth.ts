"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { signSession, verifySession } from "@/lib/session";
import * as sheets from "@/lib/sheets";
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
 * Real student accounts, stored in the Students sheet (RISE/ACCA ID, email,
 * batch, salted password hash) — see google-apps-script/Code.gs. Students
 * register with any personal email since RISE issues no institutional one,
 * then log in with their RISE/ACCA ID + password.
 */
export async function studentRegister(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const fullName = String(formData.get("full_name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const accaId = String(formData.get("acca_id") || "").trim();
  const batch = String(formData.get("batch") || "").trim();
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirm_password") || "");

  if (!fullName || !email || !accaId || !batch || !password) {
    return { error: "All fields are required." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Enter a valid email address." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  try {
    const account = await sheets.registerStudent({ fullName, email, accaId, batch, password });
    await setSessionCookie(signSession({ role: "student", ...account }));
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not create account." };
  }

  redirect("/student/dashboard");
}

export async function studentLogin(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const accaId = String(formData.get("acca_id") || "").trim();
  const password = String(formData.get("password") || "");

  if (!accaId || !password) {
    return { error: "Enter your RISE/ACCA ID and password." };
  }

  try {
    const account = await sheets.studentLoginCheck({ accaId, password });
    await setSessionCookie(signSession({ role: "student", ...account }));
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Invalid RISE/ACCA ID or password." };
  }

  redirect("/student/dashboard");
}

export async function logout(): Promise<void> {
  const jar = await cookies();
  const current = verifySession(jar.get(SESSION_COOKIE_NAME)?.value);
  jar.delete(SESSION_COOKIE_NAME);
  redirect(current?.role === "teacher" ? "/teacher/login" : "/student/login");
}
