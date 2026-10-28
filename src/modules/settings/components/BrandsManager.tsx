"use client";

import { useEffect, useId, useState, useTransition } from "react";
import { Pencil, Tags, Trash2 } from "lucide-react";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Checkbox, Switch, TextInput } from "@/components/ui/Field";
import { EmptyState, FormMessage } from "@/components/ui/Feedback";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import type { Brand } from "../queries";
import { addBrand, deleteBrand, renameBrand, setBrandPublic } from "../actions";
import { useSaveAction } from "./shared";

function AddBrandForm() {
  const [state, action, pending] = useSaveAction(addBrand);
  // React resets the form after each submit; after a refused one, defaultValue puts the typed name back.
  return (
    <form action={action} className="flex flex-col gap-3 rounded-md bg-surface-2 p-4" noValidate>
      <TextInput label="New brand" name="name" defaultValue={state.status === "error" ? state.values?.name : ""} error={state.fieldErrors?.name} />
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Checkbox name="is_public" label="Show on website" />
        <Button type="submit" variant="secondary" loading={pending}>
          Add brand
        </Button>
      </div>
      {state.status === "error" && state.message ? <FormMessage tone="error">{state.message}</FormMessage> : null}
    </form>
  );
}

function RenameBrand({ brand, onClose }: { brand: Brand; onClose: () => void }) {
  const [state, action, pending] = useSaveAction(renameBrand);
  const formId = useId();
  useEffect(() => {
    if (state.status === "success") onClose();
  }, [state, onClose]);

  return (
    <Modal
      open
      onClose={onClose}
      title="Rename brand"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={pending}>
            Save name
          </Button>
        </>
      }
    >
      <form id={formId} action={action} className="flex flex-col gap-4" noValidate>
        <input type="hidden" name="id" value={brand.id} />
        <input type="hidden" name="updated_at" value={brand.updated_at} />
        <TextInput label="Brand name" name="name" defaultValue={state.values?.name ?? brand.name} error={state.fieldErrors?.name} autoFocus />
        {state.status === "error" && state.message ? <FormMessage tone="error">{state.message}</FormMessage> : null}
      </form>
    </Modal>
  );
}

function DeleteBrand({ brand, onClose }: { brand: Brand; onClose: () => void }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const confirm = () =>
    start(async () => {
      const r = await deleteBrand(brand.id);
      if (r.ok) {
        toast.show({ kind: "success", title: r.message });
        onClose();
      } else setError(r.message);
    });

  return (
    <Modal
      open
      onClose={onClose}
      title={`Delete ${brand.name}?`}
      description="Only a brand with no articles can be deleted."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Keep it
          </Button>
          <Button variant="danger" onClick={confirm} loading={pending} icon={<Trash2 aria-hidden="true" className="size-icon" />}>
            Delete brand
          </Button>
        </>
      }
    >
      {error ? <FormMessage tone="error">{error}</FormMessage> : <p className="type-body text-fg-muted">This can&apos;t be undone. You can add it again later.</p>}
    </Modal>
  );
}

function BrandRow({ brand, onRename, onDelete }: { brand: Brand; onRename: () => void; onDelete: () => void }) {
  const toast = useToast();
  const [shown, setShown] = useState(brand.is_public);
  const [pending, start] = useTransition();
  const toggle = (next: boolean) => {
    setShown(next);
    start(async () => {
      const r = await setBrandPublic(brand.id, next);
      if (!r.ok) setShown(!next);
      toast.show({ kind: r.ok ? "success" : "error", title: r.message });
    });
  };

  return (
    <li className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:gap-6">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="truncate type-body font-semibold">{brand.name}</span>
        <StatusBadge status={shown ? "live" : "hidden"} />
      </div>
      <Switch label="Show on website" checked={shown} onChange={toggle} disabled={pending} className="md:w-sidebar" />
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={onRename} icon={<Pencil aria-hidden="true" className="size-icon-sm" />}>
          Rename
        </Button>
        <Button variant="ghost" size="sm" onClick={onDelete} icon={<Trash2 aria-hidden="true" className="size-icon-sm" />}>
          Delete
        </Button>
      </div>
    </li>
  );
}

export function BrandsManager({ brands }: { brands: Brand[] }) {
  const [renaming, setRenaming] = useState<Brand | null>(null);
  const [deleting, setDeleting] = useState<Brand | null>(null);

  return (
    <div className="flex flex-col gap-4">
      {brands.length === 0 ? (
        <EmptyState icon={Tags} title="No brands yet" description="Add the brands you make. Hidden labels stay out of the website completely." className="py-8" />
      ) : (
        <ul className="divide-y divide-border">
          {brands.map((b) => (
            <BrandRow key={`${b.id}-${b.updated_at}`} brand={b} onRename={() => setRenaming(b)} onDelete={() => setDeleting(b)} />
          ))}
        </ul>
      )}
      <AddBrandForm />
      {renaming ? <RenameBrand brand={renaming} onClose={() => setRenaming(null)} /> : null}
      {deleting ? <DeleteBrand brand={deleting} onClose={() => setDeleting(null)} /> : null}
    </div>
  );
}
