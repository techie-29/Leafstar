import { z } from "zod";

/*
  Public settings: safe in the browser by design (the anon key opens only the two public views;
  every table is closed to it by Row Level Security). Next.js only inlines NEXT_PUBLIC_* values
  that are referenced literally, so each one is read by name below.
  Validated when first used, so pages that never touch Supabase (e.g. the styleguide) build without them.
*/
const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url({ message: "NEXT_PUBLIC_SUPABASE_URL must be the project URL from Supabase → Project Settings → API" }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20, "NEXT_PUBLIC_SUPABASE_ANON_KEY is missing"),
  NEXT_PUBLIC_SITE_URL: z.url().optional(),
});

export type PublicEnv = z.infer<typeof publicSchema>;

let cached: PublicEnv | null = null;

export function publicEnv(): PublicEnv {
  if (cached) return cached;
  const parsed = publicSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || undefined,
  });
  if (!parsed.success) {
    throw new Error(`Missing or invalid public settings: ${z.prettifyError(parsed.error)}`);
  }
  cached = parsed.data;
  return cached;
}

/** True when Supabase settings are present (lets preview pages show an honest "not connected" state). */
export function hasPublicSupabaseEnv(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
