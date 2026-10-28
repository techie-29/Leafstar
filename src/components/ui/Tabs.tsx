"use client";

import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { cx } from "@/lib/cx";

export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

/** Underline tabs (DESIGN.md §5). Arrow keys move between tabs; the panel is rendered by the parent. */
export function Tabs({
  items,
  value,
  onChange,
  label,
  className,
}: {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  label: string;
  className?: string;
}) {
  const baseId = useId();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = items.findIndex((t) => t.id === value);
    let next = -1;
    if (e.key === "ArrowRight") next = (i + 1) % items.length;
    if (e.key === "ArrowLeft") next = (i - 1 + items.length) % items.length;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = items.length - 1;
    if (next >= 0) {
      e.preventDefault();
      onChange(items[next].id);
      refs.current[next]?.focus();
    }
  };

  return (
    <div role="tablist" aria-label={label} onKeyDown={onKeyDown} className={cx("flex gap-6 overflow-x-auto border-b border-border", className)}>
      {items.map((t, i) => {
        const selected = t.id === value;
        return (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            id={`${baseId}-${t.id}`}
            role="tab"
            type="button"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(t.id)}
            className={cx(
              "relative -mb-px inline-flex h-control shrink-0 items-center gap-2 border-b-2 type-small font-semibold transition-colors duration-150 focus-ring",
              selected ? "border-gold text-fg" : "border-transparent text-fg-muted hover:text-fg",
            )}
          >
            {t.label}
            {typeof t.count === "number" ? <span className="tabular text-fg-muted">{t.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div role="tabpanel" className={className}>
      {children}
    </div>
  );
}
