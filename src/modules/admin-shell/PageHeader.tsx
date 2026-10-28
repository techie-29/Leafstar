import type { ReactNode } from "react";

/** Every admin page starts with this: one h1, an optional line of help, the primary action on the right. */
export function PageHeader({ title, description, action }: { title: string; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-end md:justify-between">
      <div className="flex min-w-0 flex-col gap-2">
        <h1 className="type-h1">{title}</h1>
        {description ? <p className="max-w-prose type-body text-fg-muted">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
