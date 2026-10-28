import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { publicEnv } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";

let client: SupabaseClient<Database> | null = null;

/**
 * Service-role client: bypasses Row Level Security. Server routes only, and only for the jobs
 * AGENTS.md assigns to it (public form writes through checked routes, rate limits, AI usage logging,
 * scan-job processing). Never pass its results to the browser unfiltered.
 */
export function supabaseAdmin(): SupabaseClient<Database> {
  if (client) return client;
  client = createClient<Database>(publicEnv().NEXT_PUBLIC_SUPABASE_URL, serverEnv().SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
