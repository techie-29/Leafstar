import type { Metadata } from "next";
import { ComingInStep } from "@/modules/admin-shell/ComingInStep";

export const metadata: Metadata = { title: "Inventory" };

export default function Page() {
  return (
    <ComingInStep
      href="/admin/inventory"
      step={5}
      what="Every article with its colour and size stock grid, photos, adjustments with notes, and the full history of every stock change."
    />
  );
}
