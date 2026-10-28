"use client";

import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Field";
import { FormMessage } from "@/components/ui/Feedback";
import { saveAlertEmail } from "../actions";
import { OriginalValues, useSaveAction } from "./shared";
import { ActionForm } from "@/components/ui/ActionForm";

export function AlertsForm({ alertEmail }: { alertEmail: string | null }) {
  const [state, action, pending] = useSaveAction(saveAlertEmail);
  return (
    <ActionForm action={action} className="flex flex-col gap-4" noValidate>
      <OriginalValues values={{ alert_email: alertEmail }} />
      <TextInput
          label="Send new-enquiry alerts to"
          name="alert_email"
          type="email"
          inputMode="email"
          defaultValue={state.values?.alert_email ?? alertEmail ?? ""}
          helper="Kept private: never shown on the website. Email and phone alerts start in Step 9."
          error={state.fieldErrors?.alert_email}
        />
      {state.status === "error" && state.message ? <FormMessage tone="error">{state.message}</FormMessage> : null}
      <div className="flex md:justify-end">
        <Button type="submit" loading={pending} fullWidth className="md:w-auto">
          Save alert email
        </Button>
      </div>
    </ActionForm>
  );
}
