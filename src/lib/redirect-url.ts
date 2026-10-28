import type { NextRequest } from "next/server";

/**
 * An absolute URL on the site the visitor actually used. Next.js can report a different host
 * (e.g. "localhost" for "127.0.0.1"), and a redirect to a different host loses the login cookie.
 * NEXT_PUBLIC_SITE_URL wins when set, so a forged Host header cannot send anyone elsewhere.
 */
export function sameSiteUrl(request: NextRequest, pathAndQuery: string): URL {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return new URL(pathAndQuery, configured);
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? request.nextUrl.host;
  const proto = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
  return new URL(pathAndQuery, `${proto}://${host}`);
}
