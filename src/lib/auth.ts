import "server-only";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import type { Role, SessionUser } from "@/lib/types";

export async function getCurrentUser(): Promise<SessionUser | null> {
  return getSession();
}

/** Use in Server Components / layouts to gate a route by role, redirecting otherwise. */
export async function requireUser(role: Role): Promise<SessionUser> {
  const user = await getSession();
  if (!user) {
    redirect(role === "teacher" ? "/teacher/login" : "/student/login");
  }
  if (user.role !== role) {
    redirect(user.role === "teacher" ? "/teacher/dashboard" : "/student/dashboard");
  }
  return user;
}
