"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cx } from "@/lib/cx";

export type ToastKind = "success" | "info" | "warning" | "error";

interface ToastItem {
  id: number;
  kind: ToastKind;
  title: string;
  description?: string;
  /** Seconds before it closes on its own. */
  seconds: number;
  action?: { label: string; onClick: () => void };
  /** Undo toasts show a countdown bar; when it runs out, onExpire runs. */
  countdown?: boolean;
  onExpire?: () => void;
}

interface ToastApi {
  show: (t: Omit<ToastItem, "id" | "seconds"> & { seconds?: number }) => number;
  /** The 15-second Undo toast (DESIGN.md §5). onUndo runs if pressed in time; onExpire otherwise. */
  undo: (t: { title: string; description?: string; onUndo: () => void | Promise<void>; onExpire?: () => void; seconds?: number }) => number;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

const icons: Record<ToastKind, typeof Info> = {
  success: CheckCircle2,
  info: Info,
  warning: AlertTriangle,
  error: XCircle,
};

const iconColour: Record<ToastKind, string> = {
  success: "text-success",
  info: "text-fg",
  warning: "text-warning",
  error: "text-danger",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((all) => all.filter((t) => t.id !== id));
  }, []);

  const show = useCallback<ToastApi["show"]>((t) => {
    const id = nextId.current++;
    setToasts((all) => [...all.slice(-3), { seconds: 5, ...t, id }]);
    return id;
  }, []);

  const undo = useCallback<ToastApi["undo"]>(
    ({ title, description, onUndo, onExpire, seconds = 15 }) => {
      let id = 0;
      id = show({
        kind: "success",
        title,
        description,
        seconds,
        countdown: true,
        onExpire,
        action: {
          label: "Undo",
          onClick: () => {
            dismiss(id);
            void onUndo();
          },
        },
      });
      return id;
    },
    [show, dismiss],
  );

  const api = useMemo<ToastApi>(() => ({ show, undo, dismiss }), [show, undo, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        aria-relevant="additions"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-center gap-3 md:inset-x-auto md:right-6 md:bottom-6 md:items-end"
      >
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: number) => void }) {
  const Icon = icons[toast.kind];
  const { id, seconds, onExpire } = toast;
  // Timer depends only on stable values, so re-renders of other toasts never restart it.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      onDismiss(id);
      onExpire?.();
    }, seconds * 1000);
    return () => window.clearTimeout(timer);
  }, [id, seconds, onExpire, onDismiss]);

  return (
    <div
      role={toast.kind === "error" ? "alert" : "status"}
      className="pointer-events-auto relative w-full max-w-chat overflow-hidden card-surface shadow-2 animate-fade-in"
    >
      <div className="flex items-start gap-3 p-4">
        <Icon aria-hidden="true" className={cx("mt-1 size-icon shrink-0", iconColour[toast.kind])} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="type-small font-bold text-fg">{toast.title}</p>
          {toast.description ? <p className="type-small text-fg-muted">{toast.description}</p> : null}
        </div>
        {toast.action ? (
          <button
            type="button"
            onClick={toast.action.onClick}
            className="-my-1 inline-flex h-control-sm shrink-0 items-center rounded-md px-3 type-small font-bold text-gold-text hover:bg-surface-2 focus-ring"
          >
            {toast.action.label}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => onDismiss(id)}
          aria-label="Dismiss"
          className="-m-1 inline-flex size-control-sm shrink-0 items-center justify-center rounded-md text-fg-muted hover:bg-surface-2 hover:text-fg focus-ring"
        >
          <X aria-hidden="true" className="size-icon-sm" />
        </button>
      </div>
      {toast.countdown ? (
        <div aria-hidden="true" className="h-1 w-full bg-surface-2">
          <div
            className="h-full w-full origin-left bg-gold"
            // Countdown length is data (the toast's seconds), so it is set inline.
            style={{ animation: `ls-countdown ${toast.seconds}s linear forwards` }}
          />
        </div>
      ) : null}
    </div>
  );
}
