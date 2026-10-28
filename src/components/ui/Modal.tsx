"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cx } from "@/lib/cx";

/*
  Built on the native <dialog>: the browser traps focus, closes on Esc, returns focus to the
  opener, and puts it above everything. Page scroll is locked in globals.css (html:has(dialog[open])).
  Phone: bottom sheet. Tablet and up: centred (Modal) or right-side panel (Drawer).
*/

interface DialogBaseProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  /** Buttons row. Primary action last (right on desktop, bottom on phone). */
  footer?: ReactNode;
}

export function useNativeDialog(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handleClose = () => onClose();
    el.addEventListener("close", handleClose);
    return () => el.removeEventListener("close", handleClose);
  }, [onClose]);

  // A click that lands on the backdrop (the dialog element itself, outside the panel) closes it.
  const onBackdropClick = (event: React.MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) event.currentTarget.close();
  };

  return { ref, onBackdropClick };
}

function DialogHeader({ titleId, title, description, onClose }: { titleId: string; title: string; description?: ReactNode; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-4 md:px-6">
      <div className="flex min-w-0 flex-col gap-1">
        <h2 id={titleId} className="type-h3">
          {title}
        </h2>
        {description ? <p className="type-small text-fg-muted">{description}</p> : null}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="-mr-2 -mt-1 inline-flex size-control shrink-0 items-center justify-center rounded-md text-fg-muted transition-colors duration-150 hover:bg-surface-2 hover:text-fg focus-ring"
      >
        <X aria-hidden="true" className="size-icon" />
      </button>
    </div>
  );
}

function DialogFooter({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col-reverse gap-3 border-t border-border px-4 py-4 md:flex-row md:justify-end md:px-6">
      {children}
    </div>
  );
}

export function Modal({ open, onClose, title, description, children, footer }: DialogBaseProps) {
  const { ref, onBackdropClick } = useNativeDialog(open, onClose);
  const titleId = useId();
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClick={onBackdropClick}
      className={cx(
        "border-0 bg-surface p-0 text-fg shadow-2",
        // phone: bottom sheet
        "m-0 mt-auto w-full max-w-none max-h-sheet rounded-t-xl animate-sheet-in",
        // tablet and up: centred card
        "md:m-auto md:max-w-modal md:rounded-xl md:animate-fade-in",
      )}
    >
      {open ? (
        <div className="flex max-h-sheet flex-col">
          <div aria-hidden="true" className="mx-auto mt-2 h-1 w-12 rounded-full bg-border md:hidden" />
          <DialogHeader titleId={titleId} title={title} description={description} onClose={() => ref.current?.close()} />
          <div className="overflow-y-auto px-4 py-4 md:px-6 md:py-6">{children}</div>
          {footer ? <DialogFooter>{footer}</DialogFooter> : null}
        </div>
      ) : null}
    </dialog>
  );
}

export function Drawer({ open, onClose, title, description, children, footer }: DialogBaseProps) {
  const { ref, onBackdropClick } = useNativeDialog(open, onClose);
  const titleId = useId();
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClick={onBackdropClick}
      className={cx(
        "border-0 bg-surface p-0 text-fg shadow-2",
        "m-0 ml-auto h-full max-h-none w-full max-w-none animate-drawer-in",
        "md:max-w-drawer md:border-l md:border-border",
      )}
    >
      {open ? (
        <div className="flex h-full flex-col">
          <DialogHeader titleId={titleId} title={title} description={description} onClose={() => ref.current?.close()} />
          <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6">{children}</div>
          {footer ? <DialogFooter>{footer}</DialogFooter> : null}
        </div>
      ) : null}
    </dialog>
  );
}
