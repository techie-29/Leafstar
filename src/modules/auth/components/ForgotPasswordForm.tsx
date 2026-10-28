"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Field";
import { FormMessage } from "@/components/ui/Feedback";
import { idleForm } from "@/lib/form-state";
import { requestPasswordReset } from "../actions";

export function ForgotPasswordForm() {
  const params = useSearchParams();
  const [state, action, pending] = useActionState(requestPasswordReset, idleForm);

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {params.get("link") === "expired" && state.status === "idle" ? (
        <FormMessage tone="error">That reset link has expired or was already used. Ask for a new one below.</FormMessage>
      ) : null}
      <TextInput
        label="Email"
        name="email"
        type="email"
        autoComplete="username"
        inputMode="email"
        autoCapitalize="none"
        required
        defaultValue={state.values?.email}
        error={state.fieldErrors?.email}
      />
      {state.message ? <FormMessage tone={state.status === "success" ? "success" : "error"}>{state.message}</FormMessage> : null}
      <Button type="submit" size="lg" fullWidth loading={pending}>
        Send reset link
      </Button>
      <Link href="/admin/login" className="self-center rounded-sm type-small font-semibold text-fg underline underline-offset-4 focus-ring">
        Back to login
      </Link>
    </form>
  );
}
