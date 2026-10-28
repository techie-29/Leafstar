import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";

/** The card every sign-in screen uses: one h1, a short line of help, then the form. */
export function AuthCard({ title, description, children, footer }: { title: string; description?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <Card className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="type-h2">{title}</h1>
        {description ? <p className="type-body text-fg-muted">{description}</p> : null}
      </div>
      {children}
      {footer ? <div className="border-t border-border pt-4 type-small text-fg-muted">{footer}</div> : null}
    </Card>
  );
}

export function AuthFormSkeleton({ fields = 2 }: { fields?: number }) {
  return (
    <div className="flex flex-col gap-4" aria-hidden="true">
      {Array.from({ length: fields }, (_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <div className="skeleton h-4 w-24 rounded-sm" />
          <div className="skeleton h-control w-full rounded-md" />
        </div>
      ))}
      <div className="skeleton h-control-lg w-full rounded-md" />
    </div>
  );
}
