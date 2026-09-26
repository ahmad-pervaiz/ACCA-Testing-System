import "server-only";
import { GOOGLE_SCRIPT_URL } from "@/lib/constants";
import type {
  ExamResult,
  ExamSession,
  Mock,
  MockDraftPayload,
  MockForExam,
  MockJsonInput,
  MockWithQuestions,
} from "@/lib/types";

/**
 * Google Sheets, via a Google Apps Script Web App, plays the role Postgres
 * played before: it's the database AND (through Code.gs, which we control)
 * the trust boundary — answer-key stripping and grading happen there, not
 * here. This module only ever runs on the server (Server Components /
 * Server Actions) — never import it from a Client Component.
 */

function teacherToken(): string {
  const token = process.env.GOOGLE_SCRIPT_TEACHER_TOKEN;
  if (!token) {
    throw new Error(
      "GOOGLE_SCRIPT_TEACHER_TOKEN is not set. Copy the TEACHER_TOKEN logged by the Apps Script `setup` function into .env.local.",
    );
  }
  return token;
}

function scriptUrl(): string {
  if (!GOOGLE_SCRIPT_URL) {
    throw new Error(
      "NEXT_PUBLIC_GOOGLE_SCRIPT_URL is not set. Deploy google-apps-script/Code.gs as a Web App and put its URL in .env.local.",
    );
  }
  return GOOGLE_SCRIPT_URL;
}

/**
 * Apps Script's /exec URL responds with a 302 to a googleusercontent.com
 * execution URL. The WHATWG fetch spec downgrades POST to GET on a 301/302/
 * 303 redirect, which would silently drop the JSON body — so redirects are
 * followed manually here, preserving method and body.
 */
async function fetchFollowingRedirect(url: string, init: RequestInit): Promise<Response> {
  let response = await fetch(url, { ...init, redirect: "manual" });
  let hops = 0;
  while (response.status >= 300 && response.status < 400 && hops < 5) {
    const location = response.headers.get("location");
    if (!location) break;
    response = await fetch(location, { ...init, redirect: "manual" });
    hops += 1;
  }
  return response;
}

interface ScriptEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function scriptGet<T>(action: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(scriptUrl());
  url.searchParams.set("action", action);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  const res = await fetchFollowingRedirect(url.toString(), { method: "GET" });
  const json = (await res.json()) as ScriptEnvelope<T>;
  if (!json.success) throw new Error(json.error || "Google Sheets request failed.");
  return json.data as T;
}

async function scriptPost<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const res = await fetchFollowingRedirect(scriptUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });
  const json = (await res.json()) as ScriptEnvelope<T>;
  if (!json.success) throw new Error(json.error || "Google Sheets request failed.");
  return json.data as T;
}

// ---------------------------------------------------------------------------
// Students (real accounts — email + password; RISE has no institutional
// email to derive a login from, so students register with their own)
// ---------------------------------------------------------------------------

export interface StudentAccount {
  full_name: string;
  email: string;
  acca_id: string;
  batch: string;
}

export function registerStudent(args: {
  fullName: string;
  email: string;
  accaId: string;
  batch: string;
  password: string;
}): Promise<StudentAccount> {
  return scriptPost<StudentAccount>("registerStudent", args);
}

export function studentLoginCheck(args: {
  accaId: string;
  password: string;
}): Promise<StudentAccount> {
  return scriptPost<StudentAccount>("studentLogin", args);
}

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

export function listMocksForBatch(batch: string): Promise<Mock[]> {
  return scriptGet<Mock[]>("listMocksForBatch", { batch });
}

export function listAllMocksForTeacher(): Promise<Mock[]> {
  return scriptGet<Mock[]>("listAllMocksForTeacher", { teacherToken: teacherToken() });
}

export function getMockMeta(id: string): Promise<Mock> {
  return scriptGet<Mock>("getMockMeta", { id });
}

export function getMockForExam(id: string): Promise<MockForExam> {
  return scriptGet<MockForExam>("getMockForExam", { id });
}

/** Reveals the answer key only once the student has an actual submitted result for this mock. */
export function getMockForReview(id: string, accaId: string): Promise<MockWithQuestions> {
  return scriptGet<MockWithQuestions>("getMockForReview", { id, accaId });
}

export function getMockForEdit(id: string): Promise<MockWithQuestions> {
  return scriptGet<MockWithQuestions>("getMockForEdit", { id, teacherToken: teacherToken() });
}

export function createDraftMock(input: MockJsonInput): Promise<{ id: string }> {
  return scriptPost<{ id: string }>("createDraftMock", {
    ...input,
    batches: [],
    teacherToken: teacherToken(),
  });
}

export function updateMock(id: string, payload: MockDraftPayload): Promise<{ id: string }> {
  return scriptPost<{ id: string }>("updateMock", { id, ...payload, teacherToken: teacherToken() });
}

export function publishMock(id: string): Promise<{ id: string; status: string }> {
  return scriptPost("publishMock", { id, teacherToken: teacherToken() });
}

export function archiveMock(id: string): Promise<{ id: string; status: string }> {
  return scriptPost("archiveMock", { id, teacherToken: teacherToken() });
}

// ---------------------------------------------------------------------------
// Exam sessions
// ---------------------------------------------------------------------------

export function getSession(mockId: string, accaId: string): Promise<ExamSession | null> {
  return scriptGet<ExamSession | null>("getSession", { mockId, accaId });
}

export function beginExam(args: {
  mockId: string;
  accaId: string;
  studentName: string;
  batch: string;
}): Promise<ExamSession> {
  return scriptPost<ExamSession>("beginExam", args);
}

export function saveProgress(args: {
  mockId: string;
  accaId: string;
  responses: Record<string, string>;
  flagged: number[];
  currentQuestion: number;
}): Promise<{ ok: boolean }> {
  return scriptPost("saveProgress", args);
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

export function getResult(mockId: string, accaId: string): Promise<ExamResult | null> {
  return scriptGet<ExamResult | null>("getResult", { mockId, accaId });
}

export function listResultsForStudent(accaId: string): Promise<ExamResult[]> {
  return scriptGet<ExamResult[]>("listResultsForStudent", { accaId });
}

export function listResultsForTeacher(): Promise<ExamResult[]> {
  return scriptGet<ExamResult[]>("listResultsForTeacher", { teacherToken: teacherToken() });
}

export function submitExam(args: {
  mockId: string;
  accaId: string;
  studentName: string;
  batch: string;
  responses: Record<string, string>;
}): Promise<ExamResult> {
  return scriptPost<ExamResult>("submitExam", args);
}
