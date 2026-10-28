import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import { safeAdminPath } from "@/lib/formats";
import { sameSiteUrl } from "@/lib/redirect-url";

/*
  Where links in Supabase emails land (password reset). Two link styles are accepted:
  - ?code=…              Supabase's default email. Works when opened on the same phone or computer
                         that asked for it (the browser holds the matching half of the key).
  - ?token_hash=…&type=… The optional email template in BUILD_PLAN.md Step 2. Works on any device.
  Either way the visitor is signed in for this one purpose and sent on to set a new password.
*/
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = safeAdminPath(url.searchParams.get("next"), "/admin/update-password");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const code = url.searchParams.get("code");

  const supabase = await supabaseServer();
  let ok = false;
  if (tokenHash && type) {
    ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error;
  } else if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  }

  return NextResponse.redirect(sameSiteUrl(request, ok ? next : "/admin/forgot-password?link=expired"));
}
