"use client";

import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { AlertCircle, ChevronDown } from "lucide-react";
import { cx } from "@/lib/cx";

/* Every form control shares: label above (14/600), helper below (14 muted), error in danger with an icon
   and a danger border, 44px height, 16px text (stops iPhone zoom), radius md, border-strong (3:1). */

const controlBase =
  "w-full rounded-md border bg-surface px-3 type-body text-fg transition-colors duration-150 ease-out " +
  "placeholder:text-fg-muted focus-ring disabled:cursor-not-allowed disabled:bg-surface-2 disabled:opacity-70";

function borderFor(error?: string) {
  return error ? "border-danger" : "border-border-strong hover:border-fg";
}

interface FieldShellProps {
  id: string;
  label: string;
  required?: boolean;
  helper?: ReactNode;
  error?: string;
  hideLabel?: boolean;
  children: ReactNode;
  className?: string;
}

function FieldShell({ id, label, required, helper, error, hideLabel, children, className }: FieldShellProps) {
  return (
    <div className={cx("flex flex-col gap-2", className)}>
      <label htmlFor={id} className={cx("type-small font-semibold text-fg", hideLabel && "sr-only")}>
        {label}
        {required ? (
          <span aria-hidden="true" className="text-danger">
            {" "}*
          </span>
        ) : null}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="flex items-start gap-2 type-small text-danger">
          <AlertCircle aria-hidden="true" className="mt-1 size-icon-sm shrink-0" />
          {error}
        </p>
      ) : helper ? (
        <p id={`${id}-helper`} className="type-small text-fg-muted">
          {helper}
        </p>
      ) : null}
    </div>
  );
}

function describedBy(id: string, error?: string, helper?: ReactNode) {
  return error ? `${id}-error` : helper ? `${id}-helper` : undefined;
}

export interface TextInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "size"> {
  label: string;
  helper?: ReactNode;
  error?: string;
  hideLabel?: boolean;
  /** Fixed text shown inside the field before the value, e.g. "+91" or "@". */
  prefix?: string;
  className?: string;
}

export function TextInput({ label, helper, error, hideLabel, prefix, className, id: idProp, required, ...rest }: TextInputProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  return (
    <FieldShell id={id} label={label} required={required} helper={helper} error={error} hideLabel={hideLabel} className={className}>
      <div className="relative flex items-center">
        {prefix ? (
          <span aria-hidden="true" className="pointer-events-none absolute left-3 type-body text-fg-muted">
            {prefix}
          </span>
        ) : null}
        <input
          id={id}
          required={required}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, error, helper)}
          className={cx(controlBase, "h-control", borderFor(error), prefix && (prefix.length > 1 ? "pl-12" : "pl-8"))}
          {...rest}
        />
      </div>
    </FieldShell>
  );
}

export interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className"> {
  label: string;
  helper?: ReactNode;
  error?: string;
  className?: string;
}

export function Textarea({ label, helper, error, className, id: idProp, required, rows = 4, ...rest }: TextareaProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  return (
    <FieldShell id={id} label={label} required={required} helper={helper} error={error} className={className}>
      <textarea
        id={id}
        rows={rows}
        required={required}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, helper)}
        className={cx(controlBase, "py-3", borderFor(error))}
        {...rest}
      />
    </FieldShell>
  );
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "className"> {
  label: string;
  options: SelectOption[];
  placeholder?: string;
  helper?: ReactNode;
  error?: string;
  hideLabel?: boolean;
  className?: string;
}

/** Native select (best on phones), styled to match the other fields. */
export function Select({ label, options, placeholder, helper, error, hideLabel, className, id: idProp, required, ...rest }: SelectProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  return (
    <FieldShell id={id} label={label} required={required} helper={helper} error={error} hideLabel={hideLabel} className={className}>
      <div className="relative">
        <select
          id={id}
          required={required}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, error, helper)}
          className={cx(controlBase, "h-control appearance-none pr-12", borderFor(error))}
          {...rest}
        >
          {placeholder ? (
            <option value="" disabled>
              {placeholder}
            </option>
          ) : null}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-3 size-icon text-fg-muted" />
      </div>
    </FieldShell>
  );
}

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "className"> {
  label: ReactNode;
  className?: string;
}

/** 24px box inside a 44px-tall clickable row (label included). */
export function Checkbox({ label, className, id: idProp, ...rest }: CheckboxProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  return (
    <label htmlFor={id} className={cx("inline-flex min-h-control cursor-pointer items-center gap-3 type-body", className)}>
      <input id={id} type="checkbox" className="size-swatch-sm shrink-0 cursor-pointer accent-gold focus-ring" {...rest} />
      <span>{label}</span>
    </label>
  );
}

export interface SwitchProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
  disabled?: boolean;
  className?: string;
}

export function Switch({ label, checked, onChange, description, disabled, className }: SwitchProps) {
  const id = useId();
  return (
    <div className={cx("flex min-h-control items-center justify-between gap-4", className)}>
      <div className="flex flex-col">
        <span id={`${id}-label`} className="type-body text-fg">
          {label}
        </span>
        {description ? <span className="type-small text-fg-muted">{description}</span> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx(
          "relative inline-flex h-swatch w-12 shrink-0 items-center rounded-full transition-colors duration-150 ease-out focus-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          checked ? "bg-gold" : "bg-border-strong",
        )}
      >
        <span
          aria-hidden="true"
          className={cx(
            "inline-block size-icon rounded-full transition-transform duration-150 ease-out",
            checked ? "translate-x-6 bg-on-gold" : "translate-x-1 bg-surface",
          )}
        />
      </button>
    </div>
  );
}
