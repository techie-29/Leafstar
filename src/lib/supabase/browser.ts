import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { publicEnv } from "@/lib/env";

let client: SupabaseClient<Database> | null = null;

/**
 * Browser client (anon key + the signed-in owner's session).
 * Public pages may read ONLY `public_catalog` and `public_settings` (AGENTS.md §7);
 * everything else is refused by Row Level Security unless the owner is signed in.
 */
export function supabaseBrowser(): SupabaseClient<Database> {
  if (client) return client;
  const env = publicEnv();
  client = createBrowserClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return client;
}
