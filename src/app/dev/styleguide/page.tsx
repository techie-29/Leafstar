import type { Metadata } from "next";
import type { ReactNode } from "react";
import { MessageCircle, Phone, Trash2 } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { Badge, CountBadge, StatusBadge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { Banner, Skeleton } from "@/components/ui/Feedback";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { colourTokens, contrastPairs, type ThemeName } from "@/lib/tokens";
import { contrastRatio } from "@/lib/contrast";
import { FieldDemos, OverlayDemos, ProductDemos, StateDemos, TableDemo, TabsDemo } from "./Demos";

export const metadata: Metadata = {
  title: "Styleguide",
  robots: { index: false, follow: false },
};

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t border-border pt-8">
      <div className="flex flex-col gap-1">
        <h2 className="type-h2">{title}</h2>
        {note ? <p className="type-small text-fg-muted">{note}</p> : null}
      </div>
      {children}
    </section>
  );
}

const typeSamples = [
  { cls: "type-display", label: "Display · hero only", text: "Made in our own factory" },
  { cls: "type-h1", label: "H1 · page title", text: "Shirts and pants" },
  { cls: "type-h2", label: "H2 · section title", text: "Shop by category" },
  { cls: "type-h3", label: "H3 · card title", text: "Check Shirt" },
  { cls: "type-h4", label: "H4 · sub-heading", text: "Opening stock" },
  { cls: "type-body-lg", label: "Body large · intro", text: "Leaf Star supplies retailers in wholesale lots." },
  { cls: "type-body", label: "Body · default", text: "Request a price for any article and we will reply the same day." },
  { cls: "type-small", label: "Small · secondary, tables", text: "Min. 100 pcs · price on request" },
  { cls: "type-caption", label: "Caption · labels, SKUs", text: "LS-SH-0101-NVY-M" },
] as const;

const spacing = [4, 8, 12, 16, 24, 32, 48, 64, 96];
const spacingClass: Record<number, string> = {
  4: "w-1",
  8: "w-2",
  12: "w-3",
  16: "w-4",
  24: "w-6",
  32: "w-8",
  48: "w-12",
  64: "w-16",
  96: "w-24",
};
const radii = [
  { cls: "rounded-sm", label: "sm 6 · chips" },
  { cls: "rounded-md", label: "md 10 · buttons, inputs" },
  { cls: "rounded-lg", label: "lg 14 · cards" },
  { cls: "rounded-xl", label: "xl 20 · modals, hero media" },
  { cls: "rounded-full", label: "full · swatches, badges" },
];

const swatchTokens = [
  "bg",
  "surface",
  "surface-2",
  "border",
  "border-strong",
  "text",
  "text-muted",
  "chrome",
  "gold",
  "gold-text",
  "success",
  "warning",
  "danger",
] as const;

function ThemePanel({ theme }: { theme: ThemeName }) {
  const values = colourTokens[theme];
  return (
    <div data-theme={theme} className="flex min-w-0 flex-col gap-8 bg-bg px-4 py-8 md:px-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="type-caption text-fg-muted">THEME</span>
          <h2 className="type-h1">{theme === "light" ? "Navy & Cream" : "Black & Gold"}</h2>
        </div>
        <ThemeToggle />
      </div>

      <Section title="Logo" note="Light version on light surfaces; gold version on dark surfaces and on the chrome in both themes.">
        <div className="flex flex-wrap items-center gap-6">
          <Logo kind="lockup" surface="auto" />
          <Logo kind="mark" surface="auto" />
          <Logo kind="stacked" surface="auto" />
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-lg border border-chrome-line bg-chrome px-6 py-4">
          <Logo kind="lockup" surface="chrome" />
          <span className="type-small text-chrome-fg">On the chrome (navbar, sidebar, hero)</span>
        </div>
      </Section>

      <Section title="Colours" note="Every component uses these names only. Ratios are measured, not estimated.">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {swatchTokens.map((t) => (
            <div key={t} className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="size-control shrink-0 rounded-md border border-border"
                // Showing the raw token value is the point of this swatch.
                style={{ backgroundColor: values[t] }}
              />
              <div className="flex min-w-0 flex-col">
                <span className="type-small font-semibold">{t}</span>
                <span className="type-caption text-fg-muted">{values[t]}</span>
              </div>
            </div>
          ))}
        </div>
        <details className="card-surface p-4">
          <summary className="cursor-pointer type-small font-semibold">Contrast checks ({contrastPairs.length} pairs)</summary>
          <ul className="mt-3 grid gap-2 md:grid-cols-2">
            {contrastPairs.map((p) => {
              const ratio = contrastRatio(values[p.fg], values[p.bg]);
              const pass = ratio >= p.min;
              return (
                <li key={`${p.fg}-${p.bg}`} className="flex items-center justify-between gap-3 type-small">
                  <span className="min-w-0 truncate">
                    {p.fg} on {p.bg}
                  </span>
                  <span className={pass ? "font-semibold text-success tabular" : "font-semibold text-danger tabular"}>
                    {ratio.toFixed(2)} {pass ? "pass" : "FAIL"}
                  </span>
                </li>
              );
            })}
          </ul>
        </details>
      </Section>

      <Section title="Typography" note="Playfair Display for headings and key numbers, Manrope for everything else. Phone sizes are smaller.">
        <div className="flex flex-col gap-4">
          {typeSamples.map((s) => (
            <div key={s.cls} className="flex flex-col gap-1">
              <span className="type-caption text-fg-muted">{s.label.toUpperCase()}</span>
              <span className={s.cls}>{s.text}</span>
            </div>
          ))}
          <p className="type-small text-fg-muted">
            SKU and key numbers: <span className="type-caption text-gold-text">LS-SH-0101</span> ·{" "}
            <span className="type-number text-gold-text">12,480</span> pcs · ₹1,25,000
          </p>
        </div>
      </Section>

      <Section title="Spacing and radius" note="Only these values exist in the code; anything else fails the build check.">
        <div className="flex flex-col gap-2">
          {spacing.map((px) => (
            <div key={px} className="flex items-center gap-3">
              <span className="w-12 type-caption text-fg-muted tabular">{px}</span>
              <span aria-hidden="true" className={`h-4 rounded-sm bg-gold ${spacingClass[px]}`} />
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-4">
          {radii.map((r) => (
            <div key={r.cls} className="flex flex-col items-center gap-2">
              <span aria-hidden="true" className={`size-16 border-2 border-border-strong bg-surface ${r.cls}`} />
              <span className="type-caption text-fg-muted">{r.label}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Buttons" note="One primary button per area. Gold means action.">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Request price</Button>
          <Button variant="secondary">Inquire with AI</Button>
          <Button variant="ghost">Cancel</Button>
          <Button variant="danger" icon={<Trash2 aria-hidden="true" className="size-icon" />}>
            Undo bill
          </Button>
          <Button variant="whatsapp" icon={<MessageCircle aria-hidden="true" className="size-icon" />}>
            WhatsApp
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
          <Button iconOnly aria-label="Call" variant="secondary" icon={<Phone aria-hidden="true" className="size-icon" />} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button loading>Saving</Button>
          <Button disabled>Disabled</Button>
          <Button variant="secondary" disabled>
            Disabled
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-chrome p-4">
          <Button>Browse catalog</Button>
          <Button variant="on-chrome">Request price</Button>
          <ThemeToggle onChrome />
        </div>
      </Section>

      <Section title="Badges">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status="inStock" />
          <StatusBadge status="lowStock" />
          <StatusBadge status="outOfStock" />
          <StatusBadge status="live" />
          <StatusBadge status="hidden" />
          <StatusBadge status="overdue" />
          <Badge tone="neutral">Request price</Badge>
          <CountBadge count={5} label="unanswered" />
        </div>
      </Section>

      <Section title="Form fields" note="Label above, help or error below, 44 px tall, 16 px text so phones don't zoom.">
        <FieldDemos />
      </Section>

      <Section title="Cards">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader title="Business details" description="Shown on the website footer and contact page." action={<Button size="sm" variant="secondary">Edit</Button>} />
            <p className="type-body text-fg-muted">Light theme: white card with a soft shadow. Dark theme: outlined, no shadow.</p>
          </Card>
          <Card>
            <span className="type-caption text-fg-muted">PIECES IN STOCK</span>
            <p className="type-number type-h2">12,480</p>
            <p className="type-small font-semibold text-success">+640 this week</p>
          </Card>
        </div>
      </Section>

      <Section title="Tabs">
        <TabsDemo />
      </Section>

      <Section title="Banners">
        <div className="flex flex-col gap-3 overflow-hidden rounded-lg">
          <Banner tone="info">AI is paused. Bill scanning and the chatbot will use the manual fallbacks.</Banner>
          <Banner tone="warning">AI usage is at 82% of today&apos;s budget.</Banner>
          <Banner tone="danger">You&apos;re offline. Changes will not be saved until you reconnect.</Banner>
        </div>
      </Section>

      <Section title="Product parts" note="Sample colours only.">
        <ProductDemos />
      </Section>

      <Section title="Table" note="On phones each row becomes a card.">
        <TableDemo />
      </Section>

      <Section title="Empty, error and loading states" note="Every data view has all three.">
        <StateDemos />
        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col gap-3 card-surface p-4">
              <Skeleton className="aspect-4/5 w-full" rounded="lg" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Modal, drawer and toasts" note="On phones the modal opens as a bottom sheet and the drawer fills the screen.">
        <OverlayDemos />
      </Section>
    </div>
  );
}

export default function StyleguidePage() {
  return (
    <main className="min-h-screen bg-bg">
      <header className="flex items-center justify-between gap-4 border-b border-chrome-line bg-chrome px-4 py-4 md:px-8">
        <Logo kind="lockup" surface="chrome" priority />
        <span className="type-caption text-chrome-fg">STYLEGUIDE · STEP 1</span>
      </header>
      <div className="px-4 py-6 md:px-8">
        <h1 className="type-h1">Leaf Star design system</h1>
        <p className="mt-2 max-w-prose type-body text-fg-muted">
          Every component, in both themes, side by side. The toggle in either panel switches the whole page&apos;s saved theme. Sample data is for illustration only.
        </p>
      </div>
      <div className="grid xl:grid-cols-2">
        <ThemePanel theme="light" />
        <ThemePanel theme="dark" />
      </div>
    </main>
  );
}
