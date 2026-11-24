"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Activity, ChevronDown, LogOut, Menu } from "lucide-react";

import { LogoMark } from "@/components/brand-logo";
import { SubscriptionNotificationCenter } from "@/components/subscription/subscription-notification-center";
import { TrialBillingButton } from "@/components/subscription/trial-billing-button";
import { ChangeOwnPasswordButton } from "@/components/account/ChangeOwnPasswordButton";
import { ClinicFeedbackCenter } from "@/components/feedback/ClinicFeedbackCenter";
import { ManagerOrgChatCenter } from "@/components/manager/ManagerOrgChatCenter";
import { ClinicNotificationCenter } from "@/components/notifications/ClinicNotificationCenter";
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
  isClinicSessionAllowed,
  isSyncRequiredPathAllowed,
  renewalGatePath,
  sessionRecoveryPath,
  signupGatePath,
} from "@/lib/tenant-access";
import { requiresSetupPaymentPortal } from "@/lib/tenantProvisioning";
import { isSetupPaymentBlocking, isSubscriptionPaymentBlocking } from "@/lib/billing-access";
import { applyCatalogFeesToBilling } from "@/lib/billing-fees";
import { isIllustrationBilling } from "@/lib/tenant-demo";
import { cacheKey, fetchWithCache, invalidateCacheKey } from "@/lib/api-cache";
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
import { useBillingCatalogPricing } from "@/lib/hooks/useBillingCatalogPricing";

/** Same look in the sidebar and the phone menu: a calm rectangle, not a pill. */
const SIGN_OUT_CLASS =
  "w-full cursor-pointer justify-start gap-2.5 rounded-md border-white/15 bg-white/6 px-3.5 text-white/80 transition-colors " +
  // Destructive feel on hover / keyboard focus / press (touch screens only get the press state).
  "hover:border-red-400/60 hover:bg-red-500/20 hover:text-red-100 " +
  "focus-visible:border-red-400/70 focus-visible:ring-red-400/30 " +
  "active:border-red-400/80 active:bg-red-500/35 active:text-white";

const BILLING_CACHE_KEY = cacheKey(["billing", "me"]);
const BILLING_TTL_MS = 60_000;

type PageMeta = { title: string; subtitle?: string };

const ClinicShellMetaContext = createContext<((meta: PageMeta) => void) | null>(null);

export function useClinicShellMeta() {
  const setter = useContext(ClinicShellMetaContext);
  if (!setter) {
    throw new Error("useClinicShellMeta must be used within ClinicShellProvider");
  }
  return setter;
}

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
  const [open, setOpen] = useState(childActive);

  const Icon = item.icon;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        type="button"
        className={cn(
          "flex w-full cursor-pointer items-center gap-2.5 rounded-xl border border-transparent px-3 py-2.5 text-left text-sm font-medium transition-all duration-200",
          depth > 0 && "py-1.5 text-[13px]",
          lit
            ? "clinic-nav-active"
            : "text-white/70 hover:border-white/10 hover:bg-white/7 hover:text-white",
        )}
      >
        <span
          className={cn(
            "inline-flex size-7 shrink-0 items-center justify-center rounded-lg",
            lit ? "bg-white/20 text-white" : "bg-white/6 text-white/55",
          )}
        >
          <Icon className={cn("size-4", depth > 0 && "size-3.5")} />
        </span>
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
            prefetch
            className={cn(
              "group/nav relative flex cursor-pointer items-center gap-2.5 rounded-xl border border-transparent px-2.5 py-2 text-sm font-medium transition-all duration-200",
              depth > 0 && "py-1.5 text-[13px]",
              lit
                ? "clinic-nav-active before:absolute before:top-1/2 before:-left-2.5 before:h-6 before:w-1 before:-translate-y-1/2 before:rounded-r-full before:bg-(--role-2)"
                : "text-white/70 hover:translate-x-0.5 hover:border-white/10 hover:bg-white/7 hover:text-white",
            )}
          >
            <span
              className={cn(
                "inline-flex size-7 shrink-0 items-center justify-center rounded-lg transition-colors",
                depth > 0 && "size-6",
                lit
                  ? "bg-white/20 text-white"
                  : "bg-white/6 text-white/55 group-hover/nav:bg-(--role)/30 group-hover/nav:text-white",
              )}
            >
              <Icon className={cn("size-4", depth > 0 && "size-3.5")} />
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function ClinicShellProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);
  const router = useRouter();
  const managerBillingLoaded = useRef(false);
  // Server and first client render must match; saved session is read after mount.
  const [user, setUser] = useState<ClinicUser | null>(null);
  const [open, setOpen] = useState(false);
  const [pageMeta, setPageMeta] = useState<PageMeta>({ title: "Workspace" });
  const [opsModeLabel, setOpsModeLabel] = useState("Online");
  const [billing, setBilling] = useState<BillingSnapshot | null>(null);
  const catalogPricing = useBillingCatalogPricing();
  const displayBilling = useMemo(
    () => (billing ? applyCatalogFeesToBilling(billing, catalogPricing) : null),
    [billing, catalogPricing],
  );
  const [logoUrl, setLogoUrl] = useState("");

  const applyBillingSnapshot = useCallback((snapshot: BillingSnapshot, accessMode: string) => {
    updateBillingSession(snapshot, accessMode);
    setBilling(snapshot);
    if (snapshot.logo_url) setLogoUrl(snapshot.logo_url);
    setOpsModeLabel(CLINIC_OPS_MODE_SHORT_LABELS[parseClinicOpsMode(snapshot.ops_mode)]);
  }, []);

  const refreshBilling = useCallback(
    async (force = false) => {
      if (force) invalidateCacheKey(BILLING_CACHE_KEY);
      try {
        const data = await fetchWithCache(
          BILLING_CACHE_KEY,
          async () => {
            const { data: response } = await api.get("/billing/me/");
            return response;
          },
          BILLING_TTL_MS,
        );
        const snapshot = data.billing as BillingSnapshot;
        if (
          snapshot.billing_hold ||
          snapshot.period_status === "on_hold" ||
          data.access_mode === "denied"
        ) {
          clearSession();
          router.replace("/");
          return data;
        }
        if (requiresSetupPaymentPortal(snapshot)) {
          const current = readUser();
          if (current && String(current.role || "").toLowerCase() === "manager") {
            applyBillingSnapshot(snapshot, "payment_portal");
            router.replace("/billing");
            return data;
          }
        }
        applyBillingSnapshot(snapshot, String(data.access_mode || "full"));
        const pending = data.pending_submission as
          | { payment_kind?: string; status?: string; rejection_reason?: string }
          | null
          | undefined;
        if (isSetupPaymentBlocking(snapshot, pending) && !isIllustrationBilling(snapshot)) {
          const current = readUser();
          clearSession();
          if (current?.username) {
            router.replace(signupGatePath(current.username));
          } else {
            router.replace("/");
          }
          return data;
        }
        if (isSubscriptionPaymentBlocking(snapshot, pending) && !isIllustrationBilling(snapshot)) {
          const current = readUser();
          clearSession();
          if (current?.username) {
            router.replace(renewalGatePath(current.username));
          } else {
            router.replace("/");
          }
          return data;
        }
        if (data.access_mode === "payment_portal") {
          router.replace("/billing");
        }
        if (data.access_mode === "sync_required" && !isSyncRequiredPathAllowed(pathnameRef.current)) {
          router.replace("/manager/sync");
        }
        return data;
      } catch {
        return null;
      }
    },
    [applyBillingSnapshot, router],
  );

  useEffect(() => {
    const current = readUser();
    if (!current) {
      router.replace("/");
      return;
    }

    const mode = localStorage.getItem("access_mode");
    const stored = readBilling();

    setUser(current);
    setBilling(stored);
    setLogoUrl(current.logoUrl || stored?.logo_url || "");

    if (stored && (stored.billing_hold || stored.period_status === "on_hold")) {
      clearSession();
      router.replace("/");
      return;
    }

    if (stored && isSetupPaymentBlocking(stored) && !isIllustrationBilling(stored)) {
      clearSession();
      router.replace(signupGatePath(current.username));
      return;
    }

    if (stored && isSubscriptionPaymentBlocking(stored) && !isIllustrationBilling(stored)) {
      clearSession();
      router.replace(renewalGatePath(current.username));
      return;
    }

    if (mode === "sync_required") {
      // An overdue offline clinic: the manager can only open Sync and Billing until a sync completes.
      if (!isSyncRequiredPathAllowed(pathname)) {
        router.replace("/manager/sync");
        return;
      }
    } else if (mode === "payment_portal") {
      // Locked for payment: Billing, plus Sync so an overdue server can still be fixed.
      if (pathname !== "/manager/sync") {
        router.replace("/billing");
        return;
      }
    }

    if (!isClinicSessionAllowed(stored, current)) {
      if (
        stored &&
        requiresSetupPaymentPortal(stored) &&
        String(current.role || "").toLowerCase() === "manager"
      ) {
        updateBillingSession(stored, "payment_portal");
        router.replace("/billing");
        return;
      }
      clearSession();
      const destination = stored
        ? sessionRecoveryPath(stored, current, current.username)
        : signupGatePath(current.username);
      router.replace(destination);
      return;
    }

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
  }, [pathname, router]);

  useEffect(() => {
    const role = (user?.role || "").toLowerCase();
    if (role !== "manager" || managerBillingLoaded.current) return;
    managerBillingLoaded.current = true;
    void refreshBilling();
  }, [refreshBilling, user?.role]);

  useEffect(() => {
    const onOpsModeChanged = () => {
      void refreshBilling(true);
    };
    window.addEventListener("clinic:ops-mode-changed", onOpsModeChanged);
    return () => window.removeEventListener("clinic:ops-mode-changed", onOpsModeChanged);
  }, [refreshBilling]);

  const setMeta = useCallback((meta: PageMeta) => {
    setPageMeta(meta);
  }, []);

  const metaContext = useMemo(() => setMeta, [setMeta]);

  if (!user) {
    return (
      <div
        className="clinic-canvas flex min-h-dvh flex-col items-center justify-center gap-4"
        role="status"
        aria-live="polite"
      >
        <LogoMark size={72} plate className="animate-pulse" />
        <span className="text-xs font-semibold tracking-[0.2em] text-primary/60 uppercase">
          Loading workspace
        </span>
      </div>
    );
  }

  const role = (user.role || "").toLowerCase();
  const visibleNav = ROLE_NAV[role] || [];
  const isManager = role === "manager";

  const signOut = () => {
    clearSession();
    invalidateCacheKey(BILLING_CACHE_KEY);
    router.replace("/");
  };

  return (
    <ClinicShellMetaContext.Provider value={metaContext}>
      <div
        data-role={role}
        className="clinic-canvas flex h-dvh overflow-hidden text-foreground"
      >
        <aside className="sticky top-0 hidden h-dvh w-68 shrink-0 flex-col overflow-hidden border-r border-white/10 bg-[linear-gradient(180deg,#0e1f3d_0%,#0a1730_55%,#070f20_100%)] text-sidebar-foreground shadow-[0_30px_80px_-30px_rgba(0,0,0,0.55)] lg:flex">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-16 -right-10 h-56 w-56 rounded-full bg-(--role)/40 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute bottom-20 -left-12 h-48 w-48 rounded-full bg-(--role-2)/15 blur-3xl"
          />
          <div aria-hidden className="clinic-accent-bar absolute inset-x-0 top-0 h-1" />

          <div className="relative shrink-0 border-b border-white/10 p-3.5">
            <div className="mb-3 flex items-center gap-2.5 px-0.5">
              <LogoMark size={38} plate />
              <div className="leading-tight">
                <p className="font-heading text-[15px] font-extrabold tracking-[0.16em] text-white">
                  MEDIFLOW
                </p>
                <p className="text-[10px] font-medium tracking-[0.14em] text-white/55 uppercase">
                  Clinic management
                </p>
              </div>
            </div>
            <div className="mb-2.5 flex items-center gap-3 rounded-2xl border border-white/12 bg-white/6 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <Avatar className="size-11 shrink-0 rounded-2xl ring-2 ring-(--role-2)/60 shadow-[0_10px_30px_-10px_var(--role)]">
                {logoUrl ? (
                  <AvatarImage
                    src={logoUrl}
                    alt={user.clinic_name || "Clinic logo"}
                    className="rounded-2xl object-cover"
                  />
                ) : null}
                <AvatarFallback className="rounded-2xl bg-linear-to-br from-(--role) to-(--role-2) text-sm font-bold text-white">
                  {(user.clinic_name || "MF").trim().slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-heading text-[10px] font-semibold tracking-[0.22em] text-(--role-2) uppercase">
                  Your clinic
                </p>
                <p className="truncate font-heading text-sm font-semibold text-white">
                  {user.clinic_name || "Clinic"}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/12 bg-white/5 px-3 py-2.5">
              <p className="truncate text-sm font-medium text-white">{user.username}</p>
              <p className="truncate text-[11px] capitalize tracking-wide text-white/50">
                {user.branch_name} · {user.role}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="inline-flex rounded-full border border-(--role-2)/40 bg-(--role)/20 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white uppercase">
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
              size="lg"
              className={SIGN_OUT_CLASS}
              onClick={signOut}
            >
              <LogOut className="size-4" />
              Sign out
            </Button>
          </div>
        </aside>

        <div className="flex h-dvh min-w-0 flex-1 flex-col overflow-hidden">
          <header className="relative sticky top-0 z-10 shrink-0 border-b border-white/10 bg-[linear-gradient(115deg,rgba(11,25,46,0.97)_0%,rgba(14,31,61,0.92)_55%,color-mix(in_oklab,var(--role)_38%,rgb(11,25,46))_130%)] px-4 py-3.5 backdrop-blur-xl md:px-7">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-(--role-2) to-transparent opacity-80"
            />
            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-2 sm:flex-nowrap sm:gap-4">
              <div className="flex min-w-0 flex-1 items-start gap-2 sm:gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="mt-0.5 text-white/70 hover:bg-white/10 hover:text-white lg:hidden"
                  onClick={() => setOpen((v) => !v)}
                >
                  <Menu className="size-4" />
                </Button>
                <div>
                  <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.16em] text-(--role-2) uppercase">
                    <Activity className="size-3.5" />
                    {role} portal
                  </div>
                  <h1 className="font-heading text-xl font-semibold tracking-tight text-white md:text-2xl">
                    {pageMeta.title}
                  </h1>
                  {pageMeta.subtitle ? (
                    <p className="mt-0.5 line-clamp-2 max-w-2xl text-[13px] leading-5 text-white/75 sm:line-clamp-none sm:text-sm sm:leading-6">
                      {pageMeta.subtitle}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex w-full shrink-0 items-center justify-end gap-1 text-white sm:w-auto sm:gap-1 md:gap-1.5 [&_button]:text-white/90 [&_button]:hover:bg-white/15 [&_button]:hover:text-white [&_button_svg]:text-white/90">
                {/* On phones this row sits under the title so the title keeps the full width. */}
                {isManager && billing ? (
                  <>
                    <TrialBillingButton billing={displayBilling ?? billing} />
                    <SubscriptionNotificationCenter billing={displayBilling ?? billing} />
                    <ClinicFeedbackCenter clinicName={user.clinic_name} />
                    <ManagerOrgChatCenter />
                  </>
                ) : null}
                <ClinicNotificationCenter role={role} />
                <ChangeOwnPasswordButton />
              </div>
            </div>
          </header>

          {open ? (
            <div className="max-h-[70dvh] overflow-y-auto border-b border-white/10 bg-apex-navy lg:hidden">
              <NavLinks items={visibleNav} pathname={pathname} onNavigate={() => setOpen(false)} />
              <div className="border-t border-white/10 p-3">
                <Button
                  variant="outline"
                  size="lg"
                  className={SIGN_OUT_CLASS}
                  onClick={() => {
                    setOpen(false);
                    signOut();
                  }}
                >
                  <LogOut className="size-4" />
                  Sign out
                </Button>
              </div>
            </div>
          ) : null}

          <main className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-6 md:px-7">
            <div className="relative w-full min-w-0 pb-8">
              <div key={pathname} className="clinic-enter">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    </ClinicShellMetaContext.Provider>
  );
}
