"use client";

import { Check } from "lucide-react";
import { cx } from "@/lib/cx";
import { formatNumber } from "@/lib/numbers";

/* Swatch, SizeChip, StockBar, Stepper (DESIGN.md §5). */

export interface SwatchProps {
  name: string;
  /** The garment's real colour from the database (#RRGGBB). */
  hex: string;
  selected?: boolean;
  onSelect?: () => void;
  size?: "md" | "sm";
}

/** Colour dot with a 44px touch area; selected = ring outline. Name is the accessible label. */
export function Swatch({ name, hex, selected = false, onSelect, size = "md" }: SwatchProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={name}
      aria-pressed={selected}
      title={name}
      className="inline-flex size-control shrink-0 items-center justify-center rounded-full focus-ring"
    >
      <span
        aria-hidden="true"
        className={cx(
          "block rounded-full border border-border-strong transition-colors duration-150",
          size === "sm" ? "size-swatch-sm" : "size-swatch",
          selected ? "outline-2 outline-offset-2 outline-ring" : "outline-2 outline-offset-2 outline-transparent",
        )}
        // Product colour is data, not a design token.
        style={{ backgroundColor: hex }}
      />
    </button>
  );
}

/** Row of swatches: shows up to `max` and a "+N" count for the rest. */
export function SwatchRow({
  colours,
  selectedIndex,
  onSelect,
  max = 8,
  size,
}: {
  colours: Array<{ name: string; hex: string }>;
  selectedIndex: number;
  onSelect: (index: number) => void;
  max?: number;
  size?: "md" | "sm";
}) {
  const shown = colours.slice(0, max);
  const extra = colours.length - shown.length;
  return (
    <div role="group" aria-label="Colours" className="-mx-2 flex flex-wrap items-center">
      {shown.map((c, i) => (
        <Swatch key={`${c.name}-${i}`} name={c.name} hex={c.hex} size={size} selected={i === selectedIndex} onSelect={() => onSelect(i)} />
      ))}
      {extra > 0 ? <span className="ml-1 type-small text-fg-muted">+{extra}</span> : null}
    </div>
  );
}

/** Size pill. Public pages only show available sizes; the admin shows unavailable ones struck through. */
export function SizeChip({ size, available = true, className }: { size: string; available?: boolean; className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex h-size-chip min-w-control-sm items-center justify-center rounded-sm border border-border px-2 type-small font-semibold",
        available ? "text-fg" : "text-fg-muted line-through",
        className,
      )}
    >
      {size}
      {available ? null : <span className="sr-only"> (not available)</span>}
    </span>
  );
}

export type StockLevel = "out" | "low" | "ok";

export function stockLevel(pieces: number, lowThreshold: number): StockLevel {
  if (pieces <= 0) return "out";
  if (pieces <= lowThreshold) return "low";
  return "ok";
}

const levelFill: Record<StockLevel, string> = { out: "bg-danger", low: "bg-warning", ok: "bg-success" };
const levelText: Record<StockLevel, string> = { out: "text-danger", low: "text-warning", ok: "text-fg" };

const pieces = { format: formatNumber };

/** Stock bar is always paired with the number (never colour alone). */
export function StockBar({ value, max, lowThreshold, className }: { value: number; max: number; lowThreshold: number; className?: string }) {
  const level = stockLevel(value, lowThreshold);
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className={cx("flex items-center gap-3", className)}>
      <div className="h-bar flex-1 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
        <div
          className={cx("h-full rounded-full", levelFill[level])}
          // Width is data (share of the maximum).
          style={{ width: `${pct}%` }}
        />
      </div>
      {/* Fixed-width, right-aligned number column so every bar in a list starts and ends at the same place. */}
      <span className={cx("w-24 shrink-0 text-right type-small font-semibold tabular", levelText[level])}>{pieces.format(value)} pcs</span>
    </div>
  );
}

/** Numbered steps 01–05 (Add Stock). Done steps show a check; the current step's number is gold. */
export function Stepper({ steps, current, className }: { steps: string[]; current: number; className?: string }) {
  return (
    <ol className={cx("flex flex-wrap gap-x-6 gap-y-3", className)}>
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} aria-current={active ? "step" : undefined} className="flex items-center gap-2">
            <span
              className={cx(
                "inline-flex size-control-sm items-center justify-center rounded-full border type-small font-bold tabular",
                done && "border-success bg-success-bg text-success",
                active && "border-gold bg-gold text-on-gold",
                !done && !active && "border-border-strong text-fg-muted",
              )}
            >
              {done ? <Check aria-hidden="true" className="size-icon-sm" /> : String(i + 1).padStart(2, "0")}
              {done ? <span className="sr-only">Done: </span> : null}
            </span>
            <span className={cx("type-small font-semibold", active ? "text-fg" : "text-fg-muted")}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
