import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase auth session on every navigation and enforces
 * role-based route access:
 *   /student/**  -> requires a signed-in user with role = 'student'
 *   /teacher/**  -> requires a signed-in user with role = 'teacher'
 *   /exam/**     -> requires a signed-in student
 * Unauthenticated or wrong-role visitors are redirected to the right login.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isTeacherRoute = pathname.startsWith("/teacher") && !pathname.startsWith("/teacher/login");
  const isStudentRoute =
    (pathname.startsWith("/student") && !pathname.startsWith("/student/login") && !pathname.startsWith("/student/register")) ||
    pathname.startsWith("/exam");

  if (!isTeacherRoute && !isStudentRoute) {
    return response;
  }

  if (!user) {
    const loginPath = isTeacherRoute ? "/teacher/login" : "/student/login";
    return NextResponse.redirect(new URL(loginPath, request.url));
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (isTeacherRoute && profile?.role !== "teacher") {
    return NextResponse.redirect(new URL("/student/dashboard", request.url));
  }
  if (isStudentRoute && profile?.role !== "student") {
    return NextResponse.redirect(new URL("/teacher/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/student/:path*", "/teacher/:path*", "/exam/:path*"],
};
