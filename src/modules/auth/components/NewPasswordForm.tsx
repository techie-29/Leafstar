"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button, buttonClasses } from "@/components/ui/Button";
import { PasswordInput } from "@/components/ui/Field";
import { FormMessage } from "@/components/ui/Feedback";
import { idleForm, type FormState } from "@/lib/form-state";

/** Used after a reset link (setNewPassword) and in Settings → Account (changePassword). */
export function NewPasswordForm({
  action: serverAction,
  submitLabel = "Save new password",
  afterSuccess,
  variant = "primary",
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  submitLabel?: string;
  afterSuccess?: "link-to-admin";
  /** "secondary" where another action on the same card is the main one (Settings → Account). */
  variant?: "primary" | "secondary";
}) {
  const [state, action, pending] = useActionState(serverAction, idleForm);

  if (state.status === "success" && afterSuccess === "link-to-admin") {
    return (
      <div className="flex flex-col gap-4">
        <FormMessage tone="success">{state.message}</FormMessage>
        <Link href="/admin" className={buttonClasses({ size: "lg", fullWidth: true })}>
          Go to the admin
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <PasswordInput
        label="New password"
        name="password"
        autoComplete="new-password"
        required
        helper="At least 12 characters. A short sentence works well."
        error={state.fieldErrors?.password}
      />
      <PasswordInput label="Type it again" name="confirm" autoComplete="new-password" required error={state.fieldErrors?.confirm} />
      {state.message ? <FormMessage tone={state.status === "success" ? "success" : "error"}>{state.message}</FormMessage> : null}
      <Button type="submit" variant={variant} size={afterSuccess ? "lg" : "md"} fullWidth={Boolean(afterSuccess)} loading={pending} className="md:self-end">
        {submitLabel}
      </Button>
    </form>
  );
}
