import { Suspense } from "react";
import type { Metadata } from "next";
import { Skeleton } from "@/components/ui/Feedback";
import { PageHeader } from "@/modules/admin-shell/PageHeader";
import { loadSettings } from "@/modules/settings/queries";
import { Section } from "@/modules/settings/components/shared";
import { BusinessDetailsForm } from "@/modules/settings/components/BusinessDetailsForm";
import { BrandsManager } from "@/modules/settings/components/BrandsManager";
import { FaqManager } from "@/modules/settings/components/FaqManager";
import { AlertsForm } from "@/modules/settings/components/AlertsForm";
import { AiSection } from "@/modules/settings/components/AiSection";
import { AccountSection } from "@/modules/settings/components/AccountSection";

export const metadata: Metadata = { title: "Settings" };

const sections = [
  { id: "business", label: "Business" },
  { id: "brands", label: "Brands" },
  { id: "faq", label: "FAQ and policies" },
  { id: "alerts", label: "Alerts" },
  { id: "ai", label: "AI usage" },
  { id: "account", label: "Account" },
];

async function SettingsContent() {
  const data = await loadSettings();
  const { settings } = data;
  return (
    <div className="flex flex-col gap-6">
      <Section id="business" title="Business details" description="Name, phone, WhatsApp, email, address and Instagram appear on the website. GSTIN does not.">
        <BusinessDetailsForm key={settings.updated_at} settings={settings} />
      </Section>
      <Section id="brands" title="Brands" description="Turn off &quot;Show on website&quot; for labels that must stay private. Their articles then never appear publicly.">
        <BrandsManager brands={data.brands} />
      </Section>
      <Section id="faq" title="FAQ and policies" description="Your answers to buyers' common questions. The chatbot uses only these for policies and never makes one up.">
        <FaqManager faqs={data.faqs} />
      </Section>
      <Section id="alerts" title="Alerts" description="Where you'll hear about new enquiries.">
        <AlertsForm key={settings.updated_at} alertEmail={settings.alert_email} />
      </Section>
      <Section id="ai" title="AI usage" description="Bill scanning and the chatbot use Google Gemini. Set a daily limit and pause it any time.">
        <AiSection key={settings.updated_at} budget={settings.ai_daily_token_budget} paused={settings.ai_paused} today={data.aiToday} />
      </Section>
      <Section id="account" title="Account" description="Your password and two-step login.">
        <AccountSection email={data.email} twoStepOn={data.twoStepOn} />
      </Section>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-label="Loading settings">
      {[0, 1, 2].map((i) => (
        <div key={i} className="card-surface flex flex-col gap-4 p-4 md:p-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-full max-w-prose" />
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-control" />
            <Skeleton className="h-control" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" description="Your business details, brands, answers for the chatbot, alerts, AI limits and account." />
      <nav aria-label="Settings sections" className="-mx-4 mb-6 overflow-x-auto px-4 md:mx-0 md:px-0">
        <ul className="flex gap-2">
          {sections.map((s) => (
            <li key={s.id} className="shrink-0">
              <a
                href={`#${s.id}`}
                className="inline-flex h-control-sm items-center rounded-full border border-border bg-surface px-4 type-small font-semibold transition-colors duration-150 hover:bg-surface-2 focus-ring"
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <Suspense fallback={<SettingsSkeleton />}>
        <SettingsContent />
      </Suspense>
    </>
  );
}
