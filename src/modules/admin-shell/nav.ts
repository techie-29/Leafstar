import {
  Bot,
  FileText,
  Inbox,
  LayoutDashboard,
  PackagePlus,
  ScanLine,
  Settings,
  Shirt,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Only the exact path counts as active (the dashboard), not its children. */
  exact?: boolean;
}

/** Sidebar order (DESIGN.md §8). */
export const adminNav: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/inbox", label: "Inbox", icon: Inbox },
  { href: "/admin/inventory", label: "Inventory", icon: Shirt },
  { href: "/admin/stock/add", label: "Add stock", icon: PackagePlus },
  { href: "/admin/bills/scan", label: "Scan bills", icon: ScanLine },
  { href: "/admin/bills", label: "Bills", icon: FileText, exact: true },
  { href: "/admin/crm", label: "CRM", icon: Workflow, exact: true },
  { href: "/admin/crm/buyers", label: "Buyers", icon: Users },
  { href: "/admin/chats", label: "Chats", icon: Bot },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function isActive(item: NavItem, pathname: string): boolean {
  if (item.exact) return pathname === item.href || pathname === `${item.href}/`;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
