import type { Metadata } from "next";
import { ComingInStep } from "@/modules/admin-shell/ComingInStep";

export const metadata: Metadata = { title: "CRM" };

export default function Page() {
  return (
    <ComingInStep
      href="/admin/crm"
      step={10}
      what="Your leads from New to Won or Lost, with follow-up dates, notes and the articles each buyer asked about."
    />
  );
}
