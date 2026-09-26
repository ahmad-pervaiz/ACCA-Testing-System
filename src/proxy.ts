import { NextResponse, type NextRequest } from "next/server";
import { verifySession } from "@/lib/session";
import { SESSION_COOKIE_NAME } from "@/lib/constants";

/**
 * Enforces role-based route access using the signed session cookie:
 *   /student/**  -> requires a signed-in user with role = 'student'
 *   /teacher/**  -> requires a signed-in user with role = 'teacher'
 *   /exam/**     -> requires a signed-in student
 * Unauthenticated or wrong-role visitors are redirected to the right login.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isTeacherRoute = pathname.startsWith("/teacher") && !pathname.startsWith("/teacher/login");
  const isStudentRoute =
    (pathname.startsWith("/student") &&
      !pathname.startsWith("/student/login") &&
      !pathname.startsWith("/student/register")) ||
    pathname.startsWith("/exam");

  if (!isTeacherRoute && !isStudentRoute) {
    return NextResponse.next();
  }

  const user = verifySession(request.cookies.get(SESSION_COOKIE_NAME)?.value);

  if (!user) {
    const loginPath = isTeacherRoute ? "/teacher/login" : "/student/login";
    return NextResponse.redirect(new URL(loginPath, request.url));
  }

  if (isTeacherRoute && user.role !== "teacher") {
    return NextResponse.redirect(new URL("/student/dashboard", request.url));
  }
  if (isStudentRoute && user.role !== "student") {
    return NextResponse.redirect(new URL("/teacher/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/student/:path*", "/teacher/:path*", "/exam/:path*"],
};
