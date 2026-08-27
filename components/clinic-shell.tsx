"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Activity, ChevronDown, LogOut, Menu } from "lucide-react";

import { SubscriptionNotificationCenter } from "@/components/subscription/subscription-notification-center";
import { TrialBillingButton } from "@/components/subscription/trial-billing-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ROLE_HOME,
  api,
  clearSession,
  readBilling,
  readUser,
  updateBillingSession,
  type BillingSnapshot,
  type ClinicUser,
} from "@/lib/api";
import {
  pathAllowedForRole,
  ROLE_NAV,
  type ClinicNavItem,
} from "@/lib/clinic-nav";
import {
  CLINIC_OPS_MODE_SHORT_LABELS,
  parseClinicOpsMode,
} from "@/lib/clinicOpsMode";
import { cn } from "@/lib/utils";

function isActivePath(pathname: string, item: ClinicNavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function hasActiveDescendant(pathname: string, item: ClinicNavItem): boolean {
  if (!item.children?.length) return false;
  return item.children.some(
    (child) => isActivePath(pathname, child) || hasActiveDescendant(pathname, child),
  );
}

function CollapsibleNavItem({
  item,
  pathname,
  onNavigate,
  depth,
}: {
  item: ClinicNavItem;
  pathname: string;
  onNavigate?: () => void;
  depth: number;
}) {
  const childActive = hasActiveDescendant(pathname, item);
  const selfActive = pathname === item.href;
  const lit = selfActive || childActive;
  const [open, setOpen] = useState(false);

  const Icon = item.icon;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        type="button"
        className={cn(
          "flex w-full cursor-pointer items-center gap-2.5 rounded-xl border border-transparent px-3 py-2.5 text-left text-sm font-medium transition-all duration-200",
          depth > 0 && "py-2 text-[13px]",
          lit
            ? "clinic-nav-active"
            : "text-white/65 hover:border-white/10 hover:bg-white/6 hover:text-white",
        )}
      >
        <Icon
          className={cn(
            "size-4 shrink-0",
            depth > 0 && "size-3.5",
            lit ? "text-apex-orange-light" : "text-white/40",
          )}
        />
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 transition-transform duration-200",
            open ? "rotate-0 text-apex-orange-light" : "-rotate-90 text-white/35",
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-none">
        <NavLinks
          items={item.children || []}
          pathname={pathname}
          onNavigate={onNavigate}
          depth={depth + 1}
        />
      </CollapsibleContent>
    </Collapsible>
  );
}

function NavLinks({
  items,
  pathname,
  onNavigate,
  depth = 0,
}: {
  items: ClinicNavItem[];
  pathname: string;
  onNavigate?: () => void;
  depth?: number;
}) {
  return (
    <nav className={cn("flex flex-col gap-1", depth === 0 ? "px-2.5 py-3" : "mt-1 gap-0.5 pl-3")}>
      {items.map((item) => {
        if (item.children?.length) {
          return (
            <CollapsibleNavItem
              key={item.href}
              item={item}
              pathname={pathname}
              onNavigate={onNavigate}
              depth={depth}
            />
          );
        }

        const Icon = item.icon;
        const lit = isActivePath(pathname, item);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex cursor-pointer items-center gap-2.5 rounded-xl border border-transparent px-3 py-2.5 text-sm font-medium transition-all duration-200",
              depth > 0 && "py-2 text-[13px]",
              lit
                ? "clinic-nav-active"
                : "text-white/65 hover:border-white/10 hover:bg-white/6 hover:text-white",
            )}
          >
            <Icon
              className={cn(
                "size-4 shrink-0",
                depth > 0 && "size-3.5",
                lit ? "text-apex-orange-light" : "text-white/40",
              )}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function ClinicShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<ClinicUser | null>(() =>
    typeof window === "undefined" ? null : readUser(),
  );
  const [open, setOpen] = useState(false);
  const [opsModeLabel, setOpsModeLabel] = useState("Online");
  const [billing, setBilling] = useState<BillingSnapshot | null>(() =>
    typeof window === "undefined" ? null : readBilling(),
  );
  const [logoUrl, setLogoUrl] = useState(() => {
    if (typeof window === "undefined") return "";
    const current = readUser();
    if (current?.logoUrl) return current.logoUrl;
    const stored = readBilling();
    return stored?.logo_url || "";
  });

  const refreshBilling = useCallback(async () => {
    try {
      const { data } = await api.get("/billing/me/");
      const snapshot = data.billing as BillingSnapshot;
      updateBillingSession(snapshot, String(data.access_mode || "full"));
      setBilling(snapshot);
      if (snapshot.logo_url) setLogoUrl(snapshot.logo_url);
      setOpsModeLabel(CLINIC_OPS_MODE_SHORT_LABELS[parseClinicOpsMode(snapshot.ops_mode)]);
      if (data.access_mode === "payment_portal") {
        router.replace("/billing");
      }
      return data;
    } catch {
      return null;
    }
  }, [router]);

  useEffect(() => {
    const current = readUser();
    if (!current) {
      setUser(null);
      router.replace("/");
      return;
    }
    const mode = localStorage.getItem("access_mode");
    if (mode === "payment_portal") {
      router.replace("/billing");
      return;
    }

    const stored = readBilling();
    if (stored) {
      setBilling(stored);
      setOpsModeLabel(CLINIC_OPS_MODE_SHORT_LABELS[parseClinicOpsMode(stored.ops_mode)]);
      if (stored.logo_url) setLogoUrl(stored.logo_url);
    }

    if (current.logoUrl) setLogoUrl(current.logoUrl);

    const role = (current.role || "").toLowerCase();
    const home = ROLE_HOME[role] || "/";
    if (!pathAllowedForRole(role, pathname)) {
      router.replace(home);
      return;
    }

    setUser(current);
    if (role === "manager") {
      void refreshBilling();
    }
  }, [pathname, refreshBilling, router]);

  if (!user) {
    return (
      <div className="clinic-canvas flex min-h-dvh items-center justify-center text-sm text-muted-foreground">
        Loading workspace…
      </div>
    );
  }

  const role = (user.role || "").toLowerCase();
  const visibleNav = ROLE_NAV[role] || [];
  const isManager = role === "manager";

  const signOut = () => {
    clearSession();
    router.replace("/");
  };

  return (
    <div className="clinic-canvas flex min-h-dvh text-foreground">
      <aside className="sticky top-0 hidden h-dvh w-68 shrink-0 flex-col overflow-hidden border-r border-white/10 bg-[linear-gradient(180deg,rgba(11,25,46,0.98),rgba(6,14,26,0.99))] text-sidebar-foreground shadow-[0_30px_80px_-30px_rgba(0,0,0,0.55)] md:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-20 right-0 h-48 w-48 rounded-full bg-cta/25 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-24 left-0 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl"
        />

        <div className="relative shrink-0 border-b border-white/10 p-4">
          <div className="mb-4 flex items-center gap-3 rounded-2xl border border-white/12 bg-white/6 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <Avatar className="size-11 shrink-0 rounded-2xl ring-2 ring-cta/30 shadow-[0_10px_30px_-12px_rgba(232,149,30,0.9)]">
              {logoUrl ? (
                <AvatarImage
                  src={logoUrl}
                  alt={user.clinic_name || "Clinic logo"}
                  className="rounded-2xl object-cover"
                />
              ) : null}
              <AvatarFallback className="rounded-2xl bg-linear-to-br from-cta to-amber-600 text-sm font-bold text-apex-navy">
                {(user.clinic_name || "MF").trim().slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-heading text-[10px] font-semibold tracking-[0.22em] text-apex-orange-light/85 uppercase">
                MediFlow
              </p>
              <p className="truncate font-heading text-sm font-semibold text-white">
                {user.clinic_name || "Clinic"}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/12 bg-white/5 px-3.5 py-3">
            <p className="truncate text-sm font-medium text-white">{user.username}</p>
            <p className="truncate text-[11px] capitalize tracking-wide text-white/50">
              {user.branch_name} · {user.role}
            </p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <span className="inline-flex rounded-full border border-cta/30 bg-cta/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-apex-orange-light uppercase">
                {opsModeLabel}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-emerald-300 uppercase">
                <span className="size-1.5 rounded-full bg-emerald-400" />
                Live
              </span>
            </div>
          </div>
        </div>

        <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain scrollbar-none [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="relative px-3 pt-2">
            <p className="px-2 text-[10px] font-black tracking-[0.26em] text-white/35 uppercase">
              Modules
            </p>
          </div>
          <NavLinks items={visibleNav} pathname={pathname} />
        </div>

        <div className="relative shrink-0 border-t border-white/10 bg-[linear-gradient(180deg,rgba(6,14,26,0.92),rgba(6,14,26,0.99))] p-3">
          <div className="pointer-events-none mb-3 h-px bg-[linear-gradient(90deg,transparent,rgba(232,149,30,0.35),transparent)]" />
          <Button
            variant="outline"
            className="w-full cursor-pointer justify-start rounded-xl border-white/12 bg-white/5 text-white/70 hover:bg-white/8 hover:text-white"
            onClick={signOut}
          >
            <LogOut className="size-4" />
            Sign out
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b border-white/10 bg-[linear-gradient(180deg,rgba(11,25,46,0.94),rgba(11,25,46,0.82))] px-4 py-3.5 backdrop-blur-xl md:px-7">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="mt-0.5 text-white/70 hover:bg-white/10 hover:text-white md:hidden"
                onClick={() => setOpen((v) => !v)}
              >
                <Menu className="size-4" />
              </Button>
              <div>
                <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.16em] text-apex-orange-light uppercase">
                  <Activity className="size-3.5" />
                  {role} portal
                </div>
                <h1 className="font-heading text-xl font-semibold tracking-tight text-white md:text-2xl">
                  {title}
                </h1>
                {subtitle ? (
                  <p className="mt-0.5 max-w-2xl text-sm leading-6 text-white/55">
                    {subtitle}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-0.5 sm:gap-1 md:gap-1.5">
              {isManager && billing ? (
                <>
                  <TrialBillingButton billing={billing} />
                  <SubscriptionNotificationCenter billing={billing} />
                </>
              ) : null}
            </div>
          </div>
        </header>

        {open ? (
          <div className="border-b border-white/10 bg-apex-navy md:hidden">
            <NavLinks items={visibleNav} pathname={pathname} onNavigate={() => setOpen(false)} />
            {isManager && billing ? (
              <div className="flex items-center justify-end gap-1 border-t border-white/10 px-4 py-3">
                <TrialBillingButton billing={billing} onNavigate={() => setOpen(false)} />
                <SubscriptionNotificationCenter
                  billing={billing}
                  onNavigate={() => setOpen(false)}
                />
              </div>
            ) : null}
          </div>
        ) : null}

        <main className="relative flex-1 px-4 py-6 md:px-7">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(232,149,30,0.08),transparent)]" />
          <div className="relative">{children}</div>
        </main>
      </div>
    </div>
  );
}
