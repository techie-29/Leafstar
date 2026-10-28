import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export const metadata: Metadata = {
  // The admin is private: keep every page of it out of search engines.
  robots: { index: false, follow: false },
};

/** Login, two-step code, password reset and no-access pages: one centred card (DESIGN.md §8 Login). */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="flex items-center justify-between px-4 py-4 md:px-8">
        <Link href="/" aria-label="Leaf Star home" className="rounded-md focus-ring">
          <Logo kind="lockup" surface="auto" priority />
        </Link>
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-8 md:items-center md:pt-0">
        <div className="w-full max-w-login">{children}</div>
      </main>
    </div>
  );
}
