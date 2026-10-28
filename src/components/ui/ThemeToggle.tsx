"use client";

import { Moon, Sun } from "lucide-react";
import { applyTheme, readDocumentTheme } from "@/lib/theme";
import { cx } from "@/lib/cx";

/*
  44px circular toggle. Icons and label are switched by CSS (the dark: variant), so the server
  and the browser render the same markup and nothing flickers or mismatches on load.
*/
export function ThemeToggle({ onChrome = false, className }: { onChrome?: boolean; className?: string }) {
  return (
    <button
      type="button"
      onClick={() => applyTheme(readDocumentTheme() === "dark" ? "light" : "dark")}
      className={cx(
        "inline-flex size-control shrink-0 items-center justify-center rounded-full border transition-colors duration-150 focus-ring",
        onChrome ? "border-chrome-line text-chrome-fg hover:border-chrome-fg" : "border-border-strong text-fg hover:bg-surface-2",
        className,
      )}
    >
      <Moon aria-hidden="true" className="size-icon dark:hidden" />
      <Sun aria-hidden="true" className="hidden size-icon dark:block" />
      <span className="sr-only dark:hidden">Switch to dark theme</span>
      <span className="hidden dark:sr-only dark:inline">Switch to light theme</span>
    </button>
  );
}
