import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Spinner } from "./Spinner";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "whatsapp" | "on-chrome";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-md font-bold whitespace-nowrap select-none " +
  "transition-colors duration-150 ease-out focus-ring " +
  "disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-gold text-on-gold hover:bg-gold-hover active:bg-gold",
  secondary: "border-2 border-fg text-fg hover:bg-surface-2 active:bg-border",
  ghost: "text-fg hover:bg-surface-2 active:bg-border",
  danger: "bg-danger text-on-danger hover:opacity-90 active:opacity-100",
  whatsapp: "bg-whatsapp text-on-whatsapp hover:opacity-90 active:opacity-100",
  // secondary button placed on the navy/black chrome (navbar, hero, sidebar)
  "on-chrome": "border-2 border-chrome-line text-chrome-fg hover:border-chrome-fg",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-control-sm px-3 type-small font-bold min-w-button-min",
  md: "h-control px-4 type-small font-bold min-w-button-min",
  lg: "h-control-lg px-6 type-body font-bold min-w-button-min",
};

export interface ButtonStyleOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  iconOnly?: boolean;
}

/** Class string for anything that must look like a button (e.g. a <Link>). */
export function buttonClasses({ variant = "primary", size = "md", fullWidth, iconOnly }: ButtonStyleOptions = {}): string {
  return cx(
    base,
    variants[variant],
    iconOnly ? (size === "sm" ? "size-control-sm" : size === "lg" ? "size-control-lg" : "size-control") : sizes[size],
    fullWidth && "w-full",
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, ButtonStyleOptions {
  loading?: boolean;
  icon?: ReactNode;
  /** Layout-only classes (margin, width). Never colours or sizes. */
  className?: string;
}

export function Button({
  variant,
  size,
  fullWidth,
  iconOnly,
  loading = false,
  icon,
  className,
  children,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(buttonClasses({ variant, size, fullWidth, iconOnly }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Spinner label="Working" /> : icon}
      {iconOnly ? null : children}
    </button>
  );
}
