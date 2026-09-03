import type { LucideIcon } from "lucide-react";
import {
  Beaker,
  CalendarDays,
  ClipboardList,
  FileText,
  HeartPulse,
  LayoutDashboard,
  Package,
  Pill,
  Tags,
  Server,
  UserPlus,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";

export type ClinicNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  /** Nested sidebar buttons under this item */
  children?: ClinicNavItem[];
};

export const MANAGER_NAV: ClinicNavItem[] = [
  { href: "/manager", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/manager/staff", label: "Staff", icon: Users },
  { href: "/manager/billables", label: "Billables", icon: Tags },
  { href: "/manager/inventory", label: "Inventory", icon: Package },
  { href: "/manager/requests", label: "Requests", icon: Wrench },
  { href: "/manager/ops-mode", label: "Operating mode", icon: Server },
];

export const RECEPTION_NAV: ClinicNavItem[] = [
  { href: "/reception", label: "Today board", icon: LayoutDashboard, exact: true },
  {
    href: "/reception/register",
    label: "Register",
    icon: UserPlus,
    children: [
      { href: "/reception/register/new", label: "New patient", icon: UserPlus },
      { href: "/reception/register/returning", label: "Returning", icon: Users },
      { href: "/reception/register/referred", label: "Referred", icon: ClipboardList },
    ],
  },
  { href: "/reception/cashier", label: "Cashier", icon: Wallet },
  { href: "/reception/appointments", label: "Appointments", icon: CalendarDays },
];

export const DOCTOR_NAV: ClinicNavItem[] = [
  { href: "/doctor/chart", label: "Chart", icon: FileText },
  { href: "/doctor/orders", label: "Orders", icon: Beaker },
  { href: "/doctor/follow-up", label: "Follow-up", icon: CalendarDays },
  { href: "/doctor/referrals", label: "Referrals", icon: Users },
];

export const NURSE_NAV: ClinicNavItem[] = [
  { href: "/nurse", label: "Open encounters", icon: HeartPulse, exact: true },
  { href: "/nurse/notes", label: "Notes & vitals", icon: FileText },
  { href: "/nurse/timeline", label: "Timeline", icon: ClipboardList },
];

export const LAB_NAV: ClinicNavItem[] = [
  { href: "/lab", label: "Work queue", icon: Beaker, exact: true },
  { href: "/lab/equipment", label: "Equipment", icon: Wrench },
];

export const PHARMACY_NAV: ClinicNavItem[] = [
  { href: "/pharmacy", label: "Rx queue", icon: Pill, exact: true },
  { href: "/pharmacy/inventory", label: "Inventory", icon: Package },
];

export const ROLE_NAV: Record<string, ClinicNavItem[]> = {
  manager: MANAGER_NAV,
  reception: RECEPTION_NAV,
  doctor: DOCTOR_NAV,
  nurse: NURSE_NAV,
  lab: LAB_NAV,
  pharmacist: PHARMACY_NAV,
};

export const ROLE_PORTAL_ROOT: Record<string, string> = {
  manager: "/manager",
  reception: "/reception",
  doctor: "/doctor",
  nurse: "/nurse",
  lab: "/lab",
  pharmacist: "/pharmacy",
};

export function pathAllowedForRole(role: string, pathname: string): boolean {
  if (pathname === "/account" || pathname.startsWith("/account/")) {
    return Boolean(ROLE_PORTAL_ROOT[role.toLowerCase()] || role.toLowerCase() === "manager");
  }
  const r = role.toLowerCase();
  if (r === "manager") {
    return (
      pathname === "/manager" ||
      pathname.startsWith("/manager/") ||
      pathname === "/billing" ||
      pathname.startsWith("/billing/")
    );
  }
  const root = ROLE_PORTAL_ROOT[r];
  if (!root) return false;
  return pathname === root || pathname.startsWith(`${root}/`);
}
