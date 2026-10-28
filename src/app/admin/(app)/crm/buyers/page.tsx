import type { Metadata } from "next";
import { ComingInStep } from "@/modules/admin-shell/ComingInStep";

export const metadata: Metadata = { title: "Buyers" };

export default function Page() {
  return (
    <ComingInStep
      href="/admin/crm/buyers"
      step={10}
      what="Your buyers with what they've bought, their bill history, GSTIN and credit terms."
    />
  );
}
