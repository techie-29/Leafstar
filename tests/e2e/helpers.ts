import { createHmac } from "node:crypto";
import { expect, type Page } from "@playwright/test";
import pg from "pg";

/* Helpers for tests that run against the local Supabase stack started by scripts/e2e.mjs. */

export const stack = {
  url: process.env.LS_E2E_SUPABASE_URL ?? "",
  serviceKey: process.env.LS_E2E_SERVICE_KEY ?? "",
  dbUrl: process.env.LS_E2E_DB_URL ?? "",
  email: process.env.LS_E2E_OWNER_EMAIL ?? "",
  password: process.env.LS_E2E_OWNER_PASSWORD ?? "",
};
export const hasStack = Boolean(stack.url && stack.dbUrl);

/** Runs SQL as the database superuser (to set up a situation or check the result directly). */
export async function sql<T extends pg.QueryResultRow = pg.QueryResultRow>(text: string, params: unknown[] = []): Promise<T[]> {
  const client = new pg.Client({ connectionString: stack.dbUrl });
  await client.connect();
  try {
    return (await client.query<T>(text, params)).rows;
  } finally {
    await client.end();
  }
}

/** What the email link would contain, without sending an email (Supabase admin API). */
export async function recoveryTokenHash(email: string): Promise<string> {
  const res = await fetch(`${stack.url}/auth/v1/admin/generate_link`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${stack.serviceKey}`, apikey: stack.serviceKey },
    body: JSON.stringify({ type: "recovery", email }),
  });
  const body = (await res.json()) as { hashed_token?: string; properties?: { hashed_token?: string } };
  const hash = body.properties?.hashed_token ?? body.hashed_token;
  if (!res.ok || !hash) throw new Error(`generate_link failed: ${res.status} ${JSON.stringify(body)}`);
  return hash;
}

/** RFC 6238 one-time code, exactly what an authenticator app shows for this secret right now. */
export function totp(base32Secret: string, at = Date.now()): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const ch of base32Secret.replace(/=+$/, "").toUpperCase()) bits += alphabet.indexOf(ch).toString(2).padStart(5, "0");
  const key = Buffer.from(bits.match(/.{8}/g)!.map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(at / 1000 / 30)));
  const h = createHmac("sha1", key).update(counter).digest();
  const o = h[h.length - 1] & 0xf;
  const n = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(n % 1_000_000).padStart(6, "0");
}

/** The tests sign in far more often than a person would; clear the login counters first (they are tested on their own). */
export async function resetRateLimits() {
  await sql(`delete from rate_limits`);
}

export async function logIn(page: Page, password = stack.password, next?: string) {
  await resetRateLimits();
  await page.goto(next ? `admin/login?next=${encodeURIComponent(next)}` : "admin/login");
  await page.getByLabel("Email").fill(stack.email);
  await page.getByRole("textbox", { name: "Password", exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

export async function signOut(page: Page) {
  await page.getByRole("button", { name: /Account menu/ }).click();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/admin\/login/);
}

/** A success toast with this text appeared. */
export async function expectToast(page: Page, text: string | RegExp) {
  await expect(page.getByRole("status").filter({ hasText: text }).first()).toBeVisible();
}
