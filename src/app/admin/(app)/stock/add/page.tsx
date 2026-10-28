import type { Metadata } from "next";
import { ComingInStep } from "@/modules/admin-shell/ComingInStep";

export const metadata: Metadata = { title: "Add stock" };

export default function Page() {
  return (
    <ComingInStep
      href="/admin/stock/add"
      step={4}
      what="Add new articles with colours, sizes and photos, add production to existing ones, or import your Excel stock file."
    />
  );
}
