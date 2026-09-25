import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client — BYPASSES ROW LEVEL SECURITY entirely.
 * Server-only (never import from a Client Component). Used for the two
 * trusted operations that must not go through the browser:
 *   1. Delivering exam questions to students with the answer key stripped
 *      (server code decides what to send, not an RLS policy on `questions`)
 *   2. Grading submissions and writing `exam_results`
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
