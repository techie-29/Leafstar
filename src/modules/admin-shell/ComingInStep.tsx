"use client";

import { Construction } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/Feedback";
import { adminNav } from "./nav";
import { PageHeader } from "./PageHeader";

/**
 * A page whose feature is built in a later step of BUILD_PLAN.md. It says plainly what will be here
 * and when, rather than showing an empty screen or a fake one. The icon matches the menu item.
 */
export function ComingInStep({ href, step, what }: { href: string; step: number; what: string }) {
  const item = adminNav.find((n) => n.href === href);
  return (
    <>
      <PageHeader title={item?.label ?? "Coming soon"} />
      <Card>
        <EmptyState icon={item?.icon ?? Construction} title={`Arrives in Step ${step}`} description={what} />
      </Card>
    </>
  );
}
