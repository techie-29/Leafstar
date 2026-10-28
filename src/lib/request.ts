import "server-only";
import { headers } from "next/headers";

/**
 * The visitor's IP address, for rate limiting only (never stored on its own).
 * Vercel and most hosts put the real address first in x-forwarded-for.
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || h.get("x-real-ip") || "unknown";
}

/**
 * This site's own address, for links in emails (password reset). NEXT_PUBLIC_SITE_URL wins when set,
 * so a forged Host header can never point an email link at another site.
 */
export async function siteOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}
