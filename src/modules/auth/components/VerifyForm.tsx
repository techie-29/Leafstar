"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Field";
import { FormMessage } from "@/components/ui/Feedback";
import { idleForm } from "@/lib/form-state";
import { signOut, verifySecondStep } from "../actions";
import { ActionForm } from "@/components/ui/ActionForm";

export function VerifyForm() {
  const params = useSearchParams();
  const [state, action, pending] = useActionState(verifySecondStep, idleForm);
  const next = state.values?.next ?? params.get("next") ?? "";

  return (
    <div className="flex flex-col gap-4">
      <ActionForm action={action} className="flex flex-col gap-4" noValidate>
        <input type="hidden" name="next" value={next} />
        <TextInput
          label="6-digit code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={6}
          required
          autoFocus
          helper="Open your authenticator app and type the code shown for Leaf Star."
          error={state.fieldErrors?.code}
        />
        {state.status === "error" && state.message ? <FormMessage tone="error">{state.message}</FormMessage> : null}
        <Button type="submit" size="lg" fullWidth loading={pending}>
          Continue
        </Button>
      </ActionForm>
      <form action={signOut}>
        <Button type="submit" variant="ghost" fullWidth>
          Use a different account
        </Button>
      </form>
    </div>
  );
}
