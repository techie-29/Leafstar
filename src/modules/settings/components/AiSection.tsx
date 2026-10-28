"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Switch, TextInput } from "@/components/ui/Field";
import { FormMessage } from "@/components/ui/Feedback";
import { useToast } from "@/components/ui/Toast";
import { cx } from "@/lib/cx";
import { formatNumber } from "@/lib/numbers";
import type { AiUsageToday } from "../queries";
import { saveAiBudget, setAiPaused } from "../actions";
import { OriginalValues, useSaveAction } from "./shared";
import { ActionForm } from "@/components/ui/ActionForm";

/** AI usage today against the daily limit, the limit itself, and the pause switch (AGENTS.md §11). */
export function AiSection({ budget, paused, today }: { budget: number; paused: boolean; today: AiUsageToday }) {
  const [state, action, pending] = useSaveAction(saveAiBudget);
  const toast = useToast();
  const [switching, startSwitch] = useTransition();
  const [pausedNow, setPausedNow] = useState(paused);

  const share = budget > 0 ? today.tokens / budget : today.tokens > 0 ? 1 : 0;
  const pct = Math.min(100, Math.round(share * 100));
  const level = share >= 1 ? "danger" : share >= 0.8 ? "warning" : "success";

  const onPause = (next: boolean) => {
    setPausedNow(next);
    startSwitch(async () => {
      const r = await setAiPaused(next);
      if (!r.ok) setPausedNow(!next);
      toast.show({ kind: r.ok ? "success" : "error", title: r.message });
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-md bg-surface-2 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="type-small font-semibold">Used today (India time)</span>
          <span className="type-small tabular text-fg-muted">
            <span className="font-bold text-fg">{formatNumber(today.tokens)}</span> of {formatNumber(budget)} tokens
          </span>
        </div>
        <div
          className="h-bar overflow-hidden rounded-full bg-surface"
          role="meter"
          aria-label="AI used today"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-valuetext={`${pct}% of today's limit`}
        >
          <div
            className={cx("h-full rounded-full", level === "danger" ? "bg-danger" : level === "warning" ? "bg-warning" : "bg-success")}
            // Width is data (share of today's limit).
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="type-small text-fg-muted">
          {today.calls === 0
            ? "No AI used yet today. Real usage per bill and per chat will show here once scanning (Step 7) and the chatbot (Step 8) are built."
            : `${formatNumber(today.calls)} requests today, ${formatNumber(today.failures)} failed.`}
        </p>
      </div>

      <Switch
        label="Pause AI"
        description={
          pausedNow
            ? "Paused: bill scanning waits for you to enter lines by hand, and the chatbot offers WhatsApp instead."
            : "Running. Turn this on to stop all AI use straight away, for example if costs look wrong."
        }
        checked={pausedNow}
        onChange={onPause}
        disabled={switching}
      />

      <ActionForm action={action} className="flex flex-col gap-4 border-t border-border pt-6" noValidate>
        <OriginalValues values={{ ai_daily_token_budget: budget }} />
        <TextInput
          label="Daily limit (tokens)"
          name="ai_daily_token_budget"
          inputMode="numeric"
          defaultValue={state.values?.ai_daily_token_budget ?? formatNumber(budget)}
          helper="When today's use reaches this, AI stops until midnight and the fallbacks take over. A warning appears at 80%."
          error={state.fieldErrors?.ai_daily_token_budget}
        />
        {state.status === "error" && state.message ? <FormMessage tone="error">{state.message}</FormMessage> : null}
        <div className="flex md:justify-end">
          <Button type="submit" loading={pending} fullWidth className="md:w-auto">
            Save daily limit
          </Button>
        </div>
      </ActionForm>
    </div>
  );
}
