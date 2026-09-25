"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailFromAccaId } from "@/lib/auth";

export interface AuthActionState {
  error?: string;
}

export async function studentLogin(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const accaId = String(formData.get("acca_id") || "").trim();
  const password = String(formData.get("password") || "");

  if (!accaId || !password) {
    return { error: "Enter your RISE/ACCA Student ID and password." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: emailFromAccaId(accaId),
    password,
  });

  if (error || !data.user) {
    return { error: "Invalid Student ID or password." };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", data.user.id)
    .single();

  if (profile?.role !== "student") {
    await supabase.auth.signOut();
    return { error: "This account is not registered as a student." };
  }

  redirect("/student/dashboard");
}

export async function studentRegister(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const fullName = String(formData.get("full_name") || "").trim();
  const accaId = String(formData.get("acca_id") || "").trim();
  const batch = String(formData.get("batch") || "").trim();
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirm_password") || "");

  if (!fullName || !accaId || !batch || !password) {
    return { error: "All fields are required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const admin = createAdminClient();
  const email = emailFromAccaId(accaId);

  const { data: existing } = await admin
    .from("users")
    .select("id")
    .eq("acca_id", accaId)
    .maybeSingle();
  if (existing) {
    return { error: "An account with this Student ID already exists." };
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, acca_id: accaId, batch, role: "student" },
  });

  if (createError || !created.user) {
    return { error: createError?.message ?? "Could not create account." };
  }

  const { error: insertError } = await admin.from("users").insert({
    id: created.user.id,
    email,
    full_name: fullName,
    acca_id: accaId,
    batch,
    role: "student",
  });

  if (insertError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: "Could not create account. Please try again." };
  }

  const supabase = await createClient();
  await supabase.auth.signInWithPassword({ email, password });

  redirect("/student/dashboard");
}

export async function teacherLogin(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return { error: "Invalid email or password." };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", data.user.id)
    .single();

  if (profile?.role !== "teacher") {
    await supabase.auth.signOut();
    return { error: "This account is not registered as faculty." };
  }

  redirect("/teacher/dashboard");
}

export async function logout(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("users").select("role").eq("id", user.id).single()
    : { data: null };

  await supabase.auth.signOut();
  redirect(profile?.role === "teacher" ? "/teacher/login" : "/student/login");
}
