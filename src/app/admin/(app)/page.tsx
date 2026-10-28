import type { Metadata } from "next";
import { ComingInStep } from "@/modules/admin-shell/ComingInStep";

export const metadata: Metadata = { title: "Dashboard" };

export default function Page() {
  return (
    <ComingInStep
      href="/admin"
      step={11}
      what="What needs your attention today and how stock is doing: unanswered buyers, low and out-of-stock items, what to restock first, and slow movers."
    />
  );
}
