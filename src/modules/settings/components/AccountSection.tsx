"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { Copy, ShieldCheck, ShieldOff } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Field";
import { FormMessage } from "@/components/ui/Feedback";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { NewPasswordForm } from "@/modules/auth/components/NewPasswordForm";
import {
  cancelTwoStep,
  changePassword,
  confirmTwoStep,
  startTwoStep,
  turnOffTwoStep,
  type TwoStepEnrolment,
} from "@/modules/auth/actions";
import { useSaveAction } from "./shared";

function ConfirmCode({ enrolment, onCancel }: { enrolment: TwoStepEnrolment; onCancel: () => void }) {
  // The panel disappears as soon as two-step login is on, so the toast is shown from the save itself.
  const [state, action, pending] = useSaveAction(confirmTwoStep);
  const toast = useToast();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(enrolment.secret);
      toast.show({ kind: "success", title: "Key copied" });
    } catch {
      toast.show({ kind: "error", title: "Couldn't copy. Select the key and copy it by hand." });
    }
  };

  return (
    <div className="flex flex-col gap-6 rounded-md bg-surface-2 p-4 md:p-6">
      <ol className="flex flex-col gap-2 type-body">
        <li>1. On your phone, open an authenticator app (Google Authenticator or Microsoft Authenticator both work).</li>
        <li>2. Add an account by scanning this code, or by typing the key below.</li>
        <li>3. Type the 6-digit code the app shows.</li>
      </ol>
      <div className="flex flex-col items-start gap-4 md:flex-row md:items-center">
        <div className="rounded-md bg-surface p-3">
          <Image src={enrolment.qrCode} alt="QR code to add Leaf Star to your authenticator app" width={176} height={176} unoptimized className="size-qr" />
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <span className="type-small font-semibold">Key (if you can&apos;t scan)</span>
          <code className="break-all rounded-sm bg-surface px-3 py-2 type-small tabular">{enrolment.secret}</code>
          <Button variant="ghost" size="sm" onClick={copy} icon={<Copy aria-hidden="true" className="size-icon-sm" />} className="self-start">
            Copy key
          </Button>
        </div>
      </div>
      <form action={action} className="flex flex-col gap-4" noValidate>
        <input type="hidden" name="factorId" value={enrolment.factorId} />
        <TextInput
          label="6-digit code from the app"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          required
          error={state.fieldErrors?.code}
        />
        <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-end">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" loading={pending}>
            Turn on two-step login
          </Button>
        </div>
      </form>
    </div>
  );
}

function TwoStepLogin({ on }: { on: boolean }) {
  const toast = useToast();
  const [enrolment, setEnrolment] = useState<TwoStepEnrolment | null>(null);
  const [confirmOff, setConfirmOff] = useState(false);
  const [pending, start] = useTransition();

  const begin = () =>
    start(async () => {
      const r = await startTwoStep();
      if (r.ok) setEnrolment(r.enrolment);
      else toast.show({ kind: "error", title: r.message });
    });

  const cancel = () => {
    const id = enrolment?.factorId;
    setEnrolment(null);
    if (id) start(() => cancelTwoStep(id));
  };

  const off = () =>
    start(async () => {
      const r = await turnOffTwoStep();
      toast.show({ kind: r.ok ? "success" : "error", title: r.message });
      if (r.ok) {
        setConfirmOff(false);
        setEnrolment(null);
      }
    });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h4 className="type-h4">Two-step login</h4>
        <Badge tone={on ? "success" : "neutral"}>{on ? "On" : "Off"}</Badge>
      </div>
      <p className="max-w-prose type-body text-fg-muted">
        {on
          ? "After your password, the admin asks for a code from your phone. Someone who learns your password still can't get in."
          : "Recommended. After your password you'll also enter a code from an app on your phone, so a stolen password alone can't open the admin."}
      </p>
      {on ? (
        <Button variant="secondary" onClick={() => setConfirmOff(true)} icon={<ShieldOff aria-hidden="true" className="size-icon" />} className="self-start">
          Turn off
        </Button>
      ) : enrolment ? (
        <ConfirmCode enrolment={enrolment} onCancel={cancel} />
      ) : (
        <Button onClick={begin} loading={pending} icon={<ShieldCheck aria-hidden="true" className="size-icon" />} className="self-start">
          Turn on two-step login
        </Button>
      )}
      {confirmOff ? (
        <Modal
          open
          onClose={() => setConfirmOff(false)}
          title="Turn off two-step login?"
          description="Your password alone will open the admin again."
          footer={
            <>
              <Button variant="ghost" onClick={() => setConfirmOff(false)}>
                Keep it on
              </Button>
              <Button variant="danger" onClick={off} loading={pending}>
                Turn off
              </Button>
            </>
          }
        >
          <FormMessage tone="info">If you lost the phone with your app, turn it off here and then on again with your new phone.</FormMessage>
        </Modal>
      ) : null}
    </div>
  );
}

export function AccountSection({ email, twoStepOn }: { email: string; twoStepOn: boolean }) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <span className="type-small font-semibold">Signed in as</span>
        <span className="type-body">{email}</span>
      </div>
      <div className="flex flex-col gap-4 border-t border-border pt-6">
        <h4 className="type-h4">Change password</h4>
        <NewPasswordForm action={changePassword} submitLabel="Change password" variant="secondary" />
      </div>
      <div className="border-t border-border pt-6">
        <TwoStepLogin on={twoStepOn} />
      </div>
    </div>
  );
}
