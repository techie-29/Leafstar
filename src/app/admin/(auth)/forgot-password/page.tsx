import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthCard, AuthFormSkeleton } from "@/modules/auth/components/AuthCard";
import { ForgotPasswordForm } from "@/modules/auth/components/ForgotPasswordForm";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <AuthCard title="Reset your password" description="We'll email you a link to choose a new password.">
      <Suspense fallback={<AuthFormSkeleton fields={1} />}>
        <ForgotPasswordForm />
      </Suspense>
    </AuthCard>
  );
}
