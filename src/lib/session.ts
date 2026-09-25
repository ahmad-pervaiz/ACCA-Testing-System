import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/constants";
import type { SessionUser } from "@/lib/types";

/**
 * Zero-cost session: instead of a database-backed auth provider (Supabase
 * Auth), the session is a JSON payload + HMAC-SHA256 signature stored in a
 * cookie. Nothing is stored server-side, so there's nothing to host — but a
 * tampered cookie (e.g. a student editing their own acca_id in devtools) is
 * still rejected, because the signature won't match without SESSION_SECRET,
 * which only this server ever sees.
 */
function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) {
    throw new Error(
      "SESSION_SECRET is not set. Add a long random value to .env.local (see .env.local.example).",
    );
  }
  return s;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

export function signSession(payload: SessionUser): string {
  const body = base64url(JSON.stringify(payload));
  const signature = base64url(createHmac("sha256", secret()).update(body).digest());
  return `${body}.${signature}`;
}

export function verifySession(token: string | undefined | null): SessionUser | null {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expected = base64url(createHmac("sha256", secret()).update(body).digest());
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionUser;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  return verifySession(jar.get(SESSION_COOKIE_NAME)?.value);
}
