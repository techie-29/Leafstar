"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { clientIp, siteOrigin } from "@/lib/request";
import { rateLimitAllow } from "@/lib/rate-limit";
import { safeAdminPath } from "@/lib/formats";
import { fieldErrorsFrom, formValues, type FormState } from "@/lib/form-state";
import { requireStaff } from "./session";

/*
  Login, the two-step code, password reset and two-step setup (AGENTS.md §15).
  Passwords go straight to Supabase Auth, which hashes them; they are never stored, logged or echoed back.
  Messages never reveal whether an email address has an account.
*/

const FIFTEEN_MINUTES = 15 * 60;
const ONE_HOUR = 60 * 60;
const TOO_MANY = "Too many attempts. Please wait 15 minutes and try again.";

const email = z.email("Enter the email address you log in with").trim().toLowerCase();
const newPassword = z
  .string()
  .min(12, "Use at least 12 characters")
  .max(72, "Use at most 72 characters");

// ---------- login ----------

const loginSchema = z.object({ email, password: z.string().min(1, "Enter your password") });

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["email", "next"]);
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error.issues), values };

  const ip = await clientIp();
  const allowed =
    (await rateLimitAllow(`login:ip:${ip}`, 10, FIFTEEN_MINUTES)) &&
    (await rateLimitAllow(`login:email:${parsed.data.email}`, 10, FIFTEEN_MINUTES));
  if (!allowed) return { status: "error", message: TOO_MANY, values };

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { status: "error", message: "That email and password don't match. Check both and try again.", values };
  }

  const next = safeAdminPath(values.next);
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
    redirect(`/admin/login/verify?next=${encodeURIComponent(next)}`);
  }
  redirect(next);
}

// ---------- the authenticator code (second step) ----------

const codeSchema = z.object({ code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code from your authenticator app") });

export async function verifySecondStep(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["next"]);
  const next = safeAdminPath(values.next);
  const parsed = codeSchema.safeParse({ code: formData.get("code") });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error.issues), values };

  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect(`/admin/login?next=${encodeURIComponent(next)}`);
  if (!(await rateLimitAllow(`mfa:${userData.user.id}`, 10, FIFTEEN_MINUTES))) return { status: "error", message: TOO_MANY, values };

  const { data: factors } = await supabase.auth.mfa.listFactors();
  const totp = factors?.totp.find((f) => f.status === "verified");
  if (!totp) redirect(next);

  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: totp.id, code: parsed.data.code });
  if (error) {
    return {
      status: "error",
      fieldErrors: { code: "That code didn't work. Codes change every 30 seconds, so use the one showing now." },
      values,
    };
  }
  redirect(next);
}

// ---------- sign out ----------

export async function signOut(): Promise<void> {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect("/admin/login?signed-out=1");
}

// ---------- forgotten password ----------

export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["email"]);
  const parsed = z.object({ email }).safeParse({ email: formData.get("email") });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error.issues), values };

  const ip = await clientIp();
  if (!(await rateLimitAllow(`reset:ip:${ip}`, 5, ONE_HOUR))) return { status: "error", message: TOO_MANY, values };

  const supabase = await supabaseServer();
  const origin = await siteOrigin();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/confirm?next=/admin/update-password`,
  });
  // Logged for the owner's records only; the visitor sees the same message either way.
  if (error) console.error("[auth] reset email failed", error.message);
  return {
    status: "success",
    message: "If that email belongs to a Leaf Star account, a reset link is on its way. Open it on this same phone or computer.",
    values,
  };
}

// ---------- set a new password (after the reset link, or from Settings) ----------

const passwordPair = z
  .object({ password: newPassword, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "The two passwords don't match" });

async function savePassword(formData: FormData): Promise<FormState> {
  const parsed = passwordPair.safeParse({ password: formData.get("password"), confirm: formData.get("confirm") });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    const byCode: Record<string, string> = {
      same_password: "Choose a password different from your current one.",
      weak_password: "That password is too easy to guess. Use a longer one with a mix of words, numbers and symbols.",
      reauthentication_needed: "For safety, sign out, sign in again, and then change your password.",
    };
    return { status: "error", fieldErrors: { password: byCode[error.code ?? ""] ?? "Your password could not be changed. Please try again." } };
  }
  return { status: "success", message: "Your password has been changed." };
}

export async function setNewPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireStaff(undefined, "/admin/update-password");
  return savePassword(formData);
}

export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireStaff(undefined, "/admin/settings");
  return savePassword(formData);
}

// ---------- two-step login setup (Settings → Account) ----------

export interface TwoStepEnrolment {
  factorId: string;
  /** SVG QR code as a data URL, to scan with an authenticator app. */
  qrCode: string;
  /** The same secret as text, for typing in by hand. */
  secret: string;
}

export async function startTwoStep(): Promise<{ ok: true; enrolment: TwoStepEnrolment } | { ok: false; message: string }> {
  await requireStaff(undefined, "/admin/settings");
  const supabase = await supabaseServer();

  // Clear any setup that was started earlier and never confirmed.
  const { data: factors } = await supabase.auth.mfa.listFactors();
  for (const f of factors?.all ?? []) {
    if (f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
  }

  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `Authenticator ${new Date().toISOString().slice(0, 10)}` });
  if (error || !data) return { ok: false, message: "Two-step login could not be started. Please try again." };
  return { ok: true, enrolment: { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret } };
}

export async function confirmTwoStep(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireStaff(undefined, "/admin/settings");
  const factorId = String(formData.get("factorId") ?? "");
  const parsed = codeSchema.safeParse({ code: formData.get("code") });
  if (!parsed.success || !factorId) return { status: "error", fieldErrors: parsed.success ? { code: "Start again" } : fieldErrorsFrom(parsed.error.issues) };

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: parsed.data.code });
  if (error) return { status: "error", fieldErrors: { code: "That code didn't work. Check the time on your phone is automatic, then use the code showing now." } };
  refresh();
  return { status: "success", message: "Two-step login is on. From now on you'll enter a code from your app after your password." };
}

export async function cancelTwoStep(factorId: string): Promise<void> {
  await requireStaff(undefined, "/admin/settings");
  const supabase = await supabaseServer();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  // Only an unconfirmed setup can be cancelled here; turning off a working one has its own, deliberate path.
  if (factors?.all.some((f) => f.id === factorId && f.status === "unverified")) {
    await supabase.auth.mfa.unenroll({ factorId });
  }
}

export async function turnOffTwoStep(): Promise<{ ok: boolean; message: string }> {
  await requireStaff(undefined, "/admin/settings");
  const supabase = await supabaseServer();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  for (const f of factors?.all ?? []) {
    const { error } = await supabase.auth.mfa.unenroll({ factorId: f.id });
    if (error) return { ok: false, message: "Two-step login could not be turned off. Sign in again and retry." };
  }
  refresh();
  return { ok: true, message: "Two-step login is off. Your password alone now opens the admin." };
}
