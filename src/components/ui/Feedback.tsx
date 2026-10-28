"use client";

import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle, type LucideIcon } from "lucide-react";
import { cx } from "@/lib/cx";
import { Button } from "./Button";

/* Banner, EmptyState, ErrorState and Skeleton: the states every data view must have (DESIGN.md §6.7). */

type BannerTone = "info" | "warning" | "danger";

const bannerTone: Record<BannerTone, { box: string; icon: LucideIcon }> = {
  info: { box: "bg-surface-2 text-fg", icon: Info },
  warning: { box: "bg-warning-bg text-warning", icon: AlertTriangle },
  danger: { box: "bg-danger-bg text-danger", icon: XCircle },
};

export function Banner({ tone = "info", children, action, className }: { tone?: BannerTone; children: ReactNode; action?: ReactNode; className?: string }) {
  const { box, icon: Icon } = bannerTone[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cx("flex items-center gap-3 px-4 py-3 md:px-6", box, className)}>
      <Icon aria-hidden="true" className="size-icon shrink-0" />
      <p className="flex-1 type-small font-semibold">{children}</p>
      {action}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action, className }: { icon: LucideIcon; title: string; description: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cx("flex flex-col items-center gap-3 px-4 py-12 text-center", className)}>
      <span className="inline-flex size-fab items-center justify-center rounded-full bg-surface-2 text-fg-muted">
        <Icon aria-hidden="true" className="size-icon-lg" />
      </span>
      <h3 className="type-h4">{title}</h3>
      <p className="max-w-prose type-body text-fg-muted">{description}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", description, onRetry, className }: { title?: string; description: string; onRetry?: () => void; className?: string }) {
  return (
    <div role="alert" className={cx("flex flex-col items-center gap-3 px-4 py-12 text-center", className)}>
      <span className="inline-flex size-fab items-center justify-center rounded-full bg-danger-bg text-danger">
        <XCircle aria-hidden="true" className="size-icon-lg" />
      </span>
      <h3 className="type-h4">{title}</h3>
      <p className="max-w-prose type-body text-fg-muted">{description}</p>
      {onRetry ? (
        <Button variant="secondary" onClick={onRetry} className="mt-2">
          Try again
        </Button>
      ) : null}
    </div>
  );
}

/** Placeholder with the same size and shape as the content it stands in for, so nothing jumps. */
const skeletonRadius = { sm: "rounded-sm", md: "rounded-md", lg: "rounded-lg", xl: "rounded-xl", full: "rounded-full" } as const;

export function Skeleton({ className, rounded = "md" }: { className?: string; rounded?: keyof typeof skeletonRadius }) {
  return <div aria-hidden="true" className={cx("skeleton", skeletonRadius[rounded], className)} />;
}

/** The result line of a form (above its buttons): what happened and, on error, what to do. */
export function FormMessage({ tone, children, className }: { tone: "success" | "error" | "info"; children: ReactNode; className?: string }) {
  const style = {
    success: { box: "bg-success-bg text-success", icon: CheckCircle2 },
    error: { box: "bg-danger-bg text-danger", icon: XCircle },
    info: { box: "bg-surface-2 text-fg", icon: Info },
  }[tone];
  const Icon = style.icon;
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cx("flex items-start gap-3 rounded-md px-4 py-3", style.box, className)}>
      <Icon aria-hidden="true" className="mt-1 size-icon-sm shrink-0" />
      <p className="type-small font-semibold">{children}</p>
    </div>
  );
}
