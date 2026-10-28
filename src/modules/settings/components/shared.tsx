"use client";

import { useActionState, type ReactNode } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { idleForm, type FormState } from "@/lib/form-state";

/** One Settings section: a card with an anchor id so the quick links at the top can jump to it. */
export function Section({ id, title, description, action, children }: { id: string; title: string; description?: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24">
      <Card>
        <CardHeader title={<span id={`${id}-title`}>{title}</span>} description={description} action={action} />
        {children}
      </Card>
    </section>
  );
}

/**
 * useActionState for Settings forms, plus a success toast shown the moment the save returns.
 * (The page refreshes with the saved values at the same time, which can remount the form, so the
 * toast must not depend on the form staying on screen.)
 */
export function useSaveAction(serverAction: (prev: FormState, formData: FormData) => Promise<FormState>) {
  const toast = useToast();
  return useActionState(async (prev: FormState, formData: FormData) => {
    const result = await serverAction(prev, formData);
    if (result.status === "success" && result.message) toast.show({ kind: "success", title: result.message });
    return result;
  }, idleForm);
}

/** The values a form showed when opened, sent with the save for the "unchanged since" check. */
export function OriginalValues({ values }: { values: Record<string, string | number | boolean | null> }) {
  return <input type="hidden" name="original" value={JSON.stringify(values)} />;
}
