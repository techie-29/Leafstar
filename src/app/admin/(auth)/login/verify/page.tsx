import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthCard, AuthFormSkeleton } from "@/modules/auth/components/AuthCard";
import { VerifyForm } from "@/modules/auth/components/VerifyForm";
import { lookupStaff } from "@/modules/auth/session";

export const metadata: Metadata = { title: "Enter your code" };

/** Only for someone who gave the right password and still owes the authenticator code. */
async function OnlyWhenCodeNeeded() {
  const result = await lookupStaff();
  if (result.status === "signed-out") redirect("/admin/login");
  if (result.status === "ok" && !result.staff.needsSecondStep) redirect("/admin");
  return null;
}

export default function VerifyPage() {
  return (
    <AuthCard title="Enter your code" description="Two-step login is on for this account.">
      <Suspense fallback={<AuthFormSkeleton fields={1} />}>
        <OnlyWhenCodeNeeded />
        <VerifyForm />
      </Suspense>
    </AuthCard>
  );
}
