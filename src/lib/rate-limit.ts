import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Database-backed rate limit (AGENTS.md §7): works across every server instance, unlike a counter in memory.
 * Returns true when the action may go ahead. Fails CLOSED: if the check itself cannot run, the action is refused,
 * because a broken limiter must never become an open door.
 */
export async function rateLimitAllow(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin().rpc("rate_limit_allow", {
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error) throw error;
    return data === true;
  } catch (error) {
    console.error("[rate-limit] check failed", error);
    return false;
  }
}
