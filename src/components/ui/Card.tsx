import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/cx";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** "default" = 16 phone / 24 desktop (DESIGN.md §4); "none" when the content brings its own padding (tables, images). */
  padding?: "default" | "none";
  className?: string;
}

export function Card({ padding = "default", className, children, ...rest }: CardProps) {
  return (
    <div className={cx("card-surface", padding === "default" && "p-4 md:p-6", className)} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({ title, description, action }: { title: ReactNode; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h3 className="type-h3">{title}</h3>
        {description ? <p className="type-small text-fg-muted">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
