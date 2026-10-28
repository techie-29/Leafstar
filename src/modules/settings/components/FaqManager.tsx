"use client";

import { useEffect, useId, useState, useTransition } from "react";
import { MessageCircleQuestion, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select, Switch, TextInput, Textarea } from "@/components/ui/Field";
import { EmptyState, FormMessage } from "@/components/ui/Feedback";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import type { FaqEntry } from "../queries";
import { addFaq, deleteFaq, setFaqActive, updateFaq } from "../actions";
import { OriginalValues, useSaveAction } from "./shared";
import { ActionForm } from "@/components/ui/ActionForm";

/* The owner's own answers to buyers' common questions. The chatbot answers policy questions ONLY from
   these (AGENTS.md §9), so a missing answer makes it say "I don't know" and offer a person. */

const TOPICS = ["Minimum order", "Lots and sizes", "Dispatch time", "Delivery areas", "Payment terms", "Customisation", "Samples", "Other"];

function FaqForm({ entry, onClose }: { entry?: FaqEntry; onClose: () => void }) {
  const [state, action, pending] = useSaveAction(entry ? updateFaq : addFaq);
  const formId = useId();
  useEffect(() => {
    if (state.status === "success") onClose();
  }, [state, onClose]);
  const v = state.values;
  const topic = v?.topic ?? entry?.topic ?? "";
  const options = TOPICS.map((t) => ({ value: t, label: t }));
  if (topic && !TOPICS.includes(topic)) options.push({ value: topic, label: topic });

  return (
    <Modal
      open
      onClose={onClose}
      title={entry ? "Edit answer" : "Add an answer"}
      description="Write it the way you'd answer a buyer on the phone. The chatbot repeats it in its own short words."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={pending}>
            {entry ? "Save answer" : "Add answer"}
          </Button>
        </>
      }
    >
      <ActionForm id={formId} action={action} className="flex flex-col gap-4" noValidate>
        {entry ? (
          <>
            <input type="hidden" name="id" value={entry.id} />
            <OriginalValues values={{ topic: entry.topic, question: entry.question, answer: entry.answer }} />
          </>
        ) : null}
        <Select label="Topic" name="topic" options={options} placeholder="Choose a topic" defaultValue={topic} error={state.fieldErrors?.topic} />
        <TextInput
          label="Question"
          name="question"
          required
          defaultValue={v?.question ?? entry?.question ?? ""}
          placeholder="e.g. What is your minimum order?"
          error={state.fieldErrors?.question}
        />
        <Textarea
          label="Answer"
          name="answer"
          required
          rows={5}
          defaultValue={v?.answer ?? entry?.answer ?? ""}
          error={state.fieldErrors?.answer}
        />
        {state.status === "error" && state.message ? <FormMessage tone="error">{state.message}</FormMessage> : null}
      </ActionForm>
    </Modal>
  );
}

function DeleteFaq({ entry, onClose }: { entry: FaqEntry; onClose: () => void }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  return (
    <Modal
      open
      onClose={onClose}
      title="Delete this answer?"
      description={entry.question}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Keep it
          </Button>
          <Button
            variant="danger"
            loading={pending}
            icon={<Trash2 aria-hidden="true" className="size-icon" />}
            onClick={() =>
              start(async () => {
                const r = await deleteFaq(entry.id);
                toast.show({ kind: r.ok ? "success" : "error", title: r.message });
                if (r.ok) onClose();
              })
            }
          >
            Delete answer
          </Button>
        </>
      }
    >
      <p className="type-body text-fg-muted">The chatbot stops using it straight away. To pause it instead, turn off &quot;Chatbot uses this&quot;.</p>
    </Modal>
  );
}

function FaqRow({ entry, onEdit, onDelete }: { entry: FaqEntry; onEdit: () => void; onDelete: () => void }) {
  const toast = useToast();
  const [active, setActive] = useState(entry.is_active);
  const [pending, start] = useTransition();
  const toggle = (next: boolean) => {
    setActive(next);
    start(async () => {
      const r = await setFaqActive(entry.id, next);
      if (!r.ok) setActive(!next);
      toast.show({ kind: r.ok ? "success" : "error", title: r.message });
    });
  };

  return (
    <li className="flex flex-col gap-3 py-4">
      <div className="flex flex-col gap-2">
        {entry.topic ? <Badge className="self-start">{entry.topic}</Badge> : null}
        <p className="type-body font-semibold">{entry.question}</p>
        <p className="line-clamp-3 type-small text-fg-muted">{entry.answer}</p>
      </div>
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <Switch label="Chatbot uses this" checked={active} onChange={toggle} disabled={pending} className="md:w-sidebar" />
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onEdit} icon={<Pencil aria-hidden="true" className="size-icon-sm" />}>
            Edit
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete} icon={<Trash2 aria-hidden="true" className="size-icon-sm" />}>
            Delete
          </Button>
        </div>
      </div>
    </li>
  );
}

export function FaqManager({ faqs }: { faqs: FaqEntry[] }) {
  const [editing, setEditing] = useState<FaqEntry | "new" | null>(null);
  const [deleting, setDeleting] = useState<FaqEntry | null>(null);

  return (
    <div className="flex flex-col gap-4">
      {faqs.length === 0 ? (
        <EmptyState
          icon={MessageCircleQuestion}
          title="No answers yet"
          description="Add your minimum order, dispatch time, delivery areas, payment terms and customisation rules. Until then the chatbot says it doesn't know and offers a person."
          className="py-8"
        />
      ) : (
        <ul className="divide-y divide-border">
          {faqs.map((f) => (
            <FaqRow key={`${f.id}-${f.updated_at}`} entry={f} onEdit={() => setEditing(f)} onDelete={() => setDeleting(f)} />
          ))}
        </ul>
      )}
      <Button variant="secondary" onClick={() => setEditing("new")} icon={<Plus aria-hidden="true" className="size-icon" />} className="self-start">
        Add an answer
      </Button>
      {editing ? <FaqForm entry={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} /> : null}
      {deleting ? <DeleteFaq entry={deleting} onClose={() => setDeleting(null)} /> : null}
    </div>
  );
}
