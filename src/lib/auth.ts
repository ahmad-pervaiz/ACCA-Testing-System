import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import { STUDENT_AUTH_EMAIL_DOMAIN } from "./constants";
import type { AppUser, Role } from "./types";

/**
 * Students log in with a RISE/ACCA Student ID, not an email — Supabase Auth
 * requires an email, so we synthesize a stable, non-guessable-enough internal
 * one from the ID. It is never shown to the student and never used to
 * actually contact anyone.
 */
export function emailFromAccaId(accaId: string): string {
  const slug = accaId.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `${slug}@${STUDENT_AUTH_EMAIL_DOMAIN}`;
}

export async function getCurrentUser(): Promise<AppUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  return (data as AppUser) ?? null;
}

/** Use in Server Components / layouts to gate a route by role, redirecting otherwise. */
export async function requireUser(role: Role): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(role === "teacher" ? "/teacher/login" : "/student/login");
  }
  if (user.role !== role) {
    redirect(user.role === "teacher" ? "/teacher/dashboard" : "/student/dashboard");
  }
  return user;
}
