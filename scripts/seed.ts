/**
 * Seeds demo accounts so the app is usable immediately after setup:
 *   - one faculty account (Ali Pervaiz)
 *   - one demo student account
 * Run with: npm run seed  (reads credentials from .env.local)
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const authDomain = process.env.STUDENT_AUTH_EMAIL_DOMAIN || "students.rise.local";

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

function emailFromAccaId(accaId: string): string {
  const slug = accaId.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `${slug}@${authDomain}`;
}

async function upsertAuthUser(email: string, password: string, metadata: Record<string, unknown>) {
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata,
  });
  if (!error) return created.user;

  // Already exists — look it up instead.
  if (error.message.toLowerCase().includes("already")) {
    let page = 1;
    while (page < 20) {
      const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      const found = data.users.find((u) => u.email === email);
      if (found) return found;
      if (data.users.length < 200) break;
      page += 1;
    }
  }
  throw error;
}

async function seedTeacher() {
  const email = process.env.SEED_TEACHER_EMAIL || "ali.pervaiz@riseacademy.edu.pk";
  const password = process.env.SEED_TEACHER_PASSWORD || "ChangeMe123!";
  const fullName = process.env.SEED_TEACHER_NAME || "Ali Pervaiz";

  const user = await upsertAuthUser(email, password, { full_name: fullName, role: "teacher" });
  await admin.from("users").upsert({
    id: user.id,
    email,
    full_name: fullName,
    role: "teacher",
  });
  console.log(`Teacher ready → email: ${email}  password: ${password}`);
}

async function seedStudent() {
  const accaId = process.env.SEED_STUDENT_ACCA_ID || "RISE-2026-0001";
  const password = process.env.SEED_STUDENT_PASSWORD || "ChangeMe123!";
  const fullName = process.env.SEED_STUDENT_NAME || "Demo Student";
  const batch = process.env.SEED_STUDENT_BATCH || "Batch 2026-A";
  const email = emailFromAccaId(accaId);

  const user = await upsertAuthUser(email, password, { full_name: fullName, acca_id: accaId, batch, role: "student" });
  await admin.from("users").upsert({
    id: user.id,
    email,
    full_name: fullName,
    acca_id: accaId,
    batch,
    role: "student",
  });
  console.log(`Student ready → Student ID: ${accaId}  password: ${password}  batch: ${batch}`);
}

async function main() {
  await seedTeacher();
  await seedStudent();
  console.log("\nSeed complete. Sign in at /teacher/login or /student/login with the credentials above.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
