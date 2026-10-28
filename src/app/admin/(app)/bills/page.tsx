import type { Metadata } from "next";
import { ComingInStep } from "@/modules/admin-shell/ComingInStep";

export const metadata: Metadata = { title: "Bills" };

export default function Page() {
  return (
    <ComingInStep
      href="/admin/bills"
      step={7}
      what="Every scanned bill: what it deducted, who applied it, and a clearly confirmed undo."
    />
  );
}
