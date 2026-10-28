import type { Metadata } from "next";
import { ComingInStep } from "@/modules/admin-shell/ComingInStep";

export const metadata: Metadata = { title: "Scan bills" };

export default function Page() {
  return (
    <ComingInStep
      href="/admin/bills/scan"
      step={7}
      what="Upload many bills at once in any format. They are read, matched to your stock, reviewed by you, then deducted with a 15-second undo."
    />
  );
}
