import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthCard, AuthFormSkeleton } from "@/modules/auth/components/AuthCard";
import { LoginForm } from "@/modules/auth/components/LoginForm";
import { lookupStaff } from "@/modules/auth/session";

export const metadata: Metadata = { title: "Owner login" };

/** Someone already signed in goes straight to the admin. */
async function RedirectIfSignedIn() {
  const result = await lookupStaff();
  if (result.status === "ok" && !result.staff.needsSecondStep) redirect("/admin");
  return null;
}

export default function LoginPage() {
  return (
    <AuthCard title="Owner login" description="For the Leaf Star team only. Buyers don't need an account.">
      <Suspense fallback={<AuthFormSkeleton />}>
        <RedirectIfSignedIn />
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
