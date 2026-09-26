export const SCHOOL_NAME =
  process.env.NEXT_PUBLIC_SCHOOL_NAME || "RISE School of Accountancy";

export const TEACHER_EMAIL = (
  process.env.NEXT_PUBLIC_TEACHER_EMAIL || "alipervaiz.ca269@gmail.com"
).toLowerCase();

export const TEACHER_NAME = process.env.NEXT_PUBLIC_TEACHER_NAME || "Ali Pervaiz";

export const GOOGLE_SCRIPT_URL = process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL || "";

export const SUBJECTS = [
  "FA1",
  "MA1",
  "FA2",
  "MA2",
  "FFA",
  "FMA",
  "FA",
  "MA",
  "LW",
  "TX",
  "FR",
  "AA",
  "FM",
] as const;

export const BATCHES = [
  "Batch 2026-A",
  "Batch 2026-B",
  "Morning Batch",
  "Evening Batch",
  "Weekend Batch",
  "External / Self-Study",
] as const;

export const DEFAULT_TIME_LIMIT_MINUTES = 120;
export const DEFAULT_MARKS_PER_QUESTION = 2;
export const DEFAULT_PASS_PERCENTAGE = 50;

/** How often (ms) exam progress autosaves to the server while a student works. */
export const AUTOSAVE_INTERVAL_MS = 15_000;
/** Warn the student when this many seconds remain. */
export const LOW_TIME_WARNING_SECONDS = 5 * 60;

/** Signed-cookie session name and max age (30 days). */
export const SESSION_COOKIE_NAME = "acca_cbt_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
