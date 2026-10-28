import "server-only";
import { supabaseServer } from "@/lib/supabase/server";
import { requireStaff } from "@/modules/auth/session";
import type { Database } from "@/types/database";

export type BusinessSettings = Database["public"]["Tables"]["business_settings"]["Row"];
export type Brand = Pick<Database["public"]["Tables"]["brands"]["Row"], "id" | "name" | "is_public" | "updated_at">;
export type FaqEntry = Database["public"]["Tables"]["faq_entries"]["Row"];

export interface AiUsageToday {
  tokens: number;
  calls: number;
  failures: number;
}

export interface SettingsData {
  email: string;
  settings: BusinessSettings;
  brands: Brand[];
  faqs: FaqEntry[];
  aiToday: AiUsageToday;
  twoStepOn: boolean;
}

/** Today's date in India (the AI budget resets at midnight IST, matching the database). */
export function indiaToday(now: Date): string {
  return new Date(now.getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** Everything the Settings page shows. Checks the person first, then reads under their own permissions. */
export async function loadSettings(): Promise<SettingsData> {
  const staff = await requireStaff(undefined, "/admin/settings");
  const supabase = await supabaseServer();

  const [settings, brands, faqs, usage] = await Promise.all([
    supabase.from("business_settings").select("*").single(),
    supabase.from("brands").select("id, name, is_public, updated_at").order("name"),
    supabase.from("faq_entries").select("*").order("sort_order").order("question"),
    supabase.from("ai_usage_daily").select("tokens, calls, failures").eq("day", indiaToday(new Date())),
  ]);
  for (const r of [settings, brands, faqs, usage]) {
    if (r.error) throw new Error(`Settings could not be loaded: ${r.error.message}`);
  }

  const aiToday = (usage.data ?? []).reduce<AiUsageToday>(
    (sum, row) => ({
      tokens: sum.tokens + Number(row.tokens ?? 0),
      calls: sum.calls + (row.calls ?? 0),
      failures: sum.failures + (row.failures ?? 0),
    }),
    { tokens: 0, calls: 0, failures: 0 },
  );

  return {
    email: staff.email,
    settings: settings.data!,
    brands: brands.data ?? [],
    faqs: faqs.data ?? [],
    aiToday,
    twoStepOn: staff.twoStepOn,
  };
}
