import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthCard, AuthFormSkeleton } from "@/modules/auth/components/AuthCard";
import { NewPasswordForm } from "@/modules/auth/components/NewPasswordForm";
import { requireStaff } from "@/modules/auth/session";
import { setNewPassword } from "@/modules/auth/actions";

export const metadata: Metadata = { title: "Choose a new password" };

async function Form() {
  await requireStaff(undefined, "/admin/update-password");
  return <NewPasswordForm action={setNewPassword} afterSuccess="link-to-admin" />;
}

export default function UpdatePasswordPage() {
  return (
    <AuthCard title="Choose a new password" description="You're signed in from your reset link. Set the password you'll use from now on.">
      <Suspense fallback={<AuthFormSkeleton />}>
        <Form />
      </Suspense>
    </AuthCard>
  );
}
