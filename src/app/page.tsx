import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { buttonClasses } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

// Temporary holding page until the real Home page is built in Step 6.
export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col bg-chrome text-chrome-fg">
      <header className="flex items-center justify-between px-4 py-4 md:px-8">
        <Logo kind="lockup" surface="chrome" priority />
        <ThemeToggle onChrome />
      </header>
      <div className="mx-auto flex w-full max-w-page flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center">
        <Logo kind="stacked" surface="chrome" />
        <h1 className="type-display">Our new website is being built</h1>
        <p className="max-w-prose type-body-lg">
          Premium shirts and pants, made in our own factory and supplied in wholesale lots.
        </p>
        <Link href="/dev/styleguide" className={buttonClasses({ variant: "primary", size: "lg" })}>
          See the design system
        </Link>
      </div>
    </main>
  );
}
