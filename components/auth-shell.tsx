import type { ReactNode } from "react";
import { LogoLockup } from "@/components/brand-logo";
import { cn } from "@/lib/utils";

export const AUTH_CARD =
  "auth-shimmer relative w-full max-w-[28rem] overflow-hidden rounded-2xl border border-primary/10 bg-white before:absolute before:inset-x-0 before:top-0 before:z-10 before:h-1 before:bg-linear-to-r before:from-blue-600 before:via-amber-400 before:to-teal-400 shadow-[0_24px_80px_-28px_rgba(30,58,138,0.35)] ring-1 ring-primary/10";

export const AUTH_SIGNUP_CARD =
  "auth-shimmer relative mx-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-primary/10 bg-white before:absolute before:inset-x-0 before:top-0 before:z-10 before:h-1 before:bg-linear-to-r before:from-blue-600 before:via-amber-400 before:to-teal-400 shadow-[0_24px_80px_-28px_rgba(30,58,138,0.35)] ring-1 ring-primary/10 transition-shadow duration-500 hover:shadow-[0_24px_80px_-24px_rgba(30,58,138,0.45)]";

export const AUTH_BAND =
  "border-primary/10 bg-linear-to-r from-blue-100/70 via-white to-amber-100/70";

export const AUTH_EYEBROW =
  "text-[11px] font-medium tracking-[0.22em] text-cta uppercase";

export const AUTH_TITLE = "font-heading text-primary";

export const AUTH_SUBTITLE = "text-[15px] leading-relaxed text-muted-foreground";

export const AUTH_MUTED = "text-muted-foreground";

export const AUTH_LINK = "font-medium text-primary underline-offset-4 hover:underline";

export const AUTH_BUTTON =
  "bg-primary text-primary-foreground hover:bg-primary/90";

export const AUTH_PANEL_NAVY =
  "rounded-2xl border border-primary/15 bg-linear-to-br from-primary/10 via-white to-primary/5 p-4";

export const AUTH_PANEL_ORANGE =
  "rounded-2xl border border-cta/20 bg-linear-to-br from-cta/10 via-white to-orange-50 p-4";

const ROLE_CHIPS = [
  { label: "Reception", dot: "#2dd4bf" },
  { label: "Doctor", dot: "#60a5fa" },
  { label: "Nurse", dot: "#fb7185" },
  { label: "Lab", dot: "#a78bfa" },
  { label: "Radiology", dot: "#818cf8" },
  { label: "Pharmacy", dot: "#34d399" },
  { label: "Manager", dot: "#fbbf24" },
];

function BrandMark({ light = false }: { light?: boolean }) {
  if (light) {
    // Dark panel: the full-colour logo sits on a white plate so the navy stays readable.
    return (
      <div className="auth-rise w-fit rounded-2xl bg-white px-5 py-3.5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.55)] ring-1 ring-white/70">
        <LogoLockup width={236} priority />
      </div>
    );
  }
  return <LogoLockup width={230} priority />;
}

export function AuthShell({
  children,
  compact,
}: {
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className="min-h-dvh text-foreground lg:grid lg:grid-cols-[minmax(300px,40%)_1fr]">
      <aside className="relative hidden overflow-hidden bg-linear-to-br from-[#0f1c4d] via-[#1e3a8a] to-[#16306f] lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:justify-between lg:px-12 lg:py-14">
        <div
          aria-hidden
          className="auth-orb-a pointer-events-none absolute -top-10 -left-16 h-80 w-80 rounded-full bg-cta/30 blur-3xl"
        />
        <div
          aria-hidden
          className="auth-orb-b pointer-events-none absolute right-[-20%] -bottom-16 h-72 w-72 rounded-full bg-sky-300/25 blur-3xl"
        />
        <div
          aria-hidden
          className="auth-orb-a pointer-events-none absolute top-1/3 right-[-10%] h-64 w-64 rounded-full bg-violet-500/25 blur-3xl"
        />
        <div
          aria-hidden
          className="auth-orb-b pointer-events-none absolute bottom-1/4 left-[-12%] h-56 w-56 rounded-full bg-teal-400/20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.18) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse 80% 70% at 20% 40%, black, transparent)",
          }}
        />
        <div className="relative">
          <BrandMark light />
        </div>
        <div className="relative mt-2 flex max-w-sm flex-col gap-6">
          <p className="auth-rise auth-delay-1 flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-blue-100">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-cta opacity-75" />
              <span className="relative inline-flex size-1.5 rounded-full bg-cta" />
            </span>
            Staff portal
          </p>
          <p className="auth-rise auth-delay-1 font-heading text-[2.05rem] leading-[1.15] font-bold tracking-tight text-white text-balance">
            Quiet, payment-gated care{" "}
            <span className="bg-linear-to-r from-orange-200 via-orange-400 to-amber-200 bg-clip-text text-transparent">
              for every clinic role
            </span>
            .
          </p>
          <p className="auth-rise auth-delay-2 text-sm leading-relaxed text-blue-100/80">
            Reception, doctors, nursing, lab, pharmacy, and managers — one light, precise
            workspace built for the floor.
          </p>
          <ul className="auth-rise auth-delay-3 flex flex-wrap gap-2">
            {ROLE_CHIPS.map((r) => (
              <li
                key={r.label}
                className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/8 px-2.5 py-1 text-[11px] font-medium text-blue-50 backdrop-blur-sm"
              >
                <span className="size-2 rounded-full" style={{ background: r.dot, boxShadow: `0 0 10px ${r.dot}` }} />
                {r.label}
              </li>
            ))}
          </ul>
        </div>
        <p className="auth-rise auth-delay-3 relative text-xs tracking-[0.18em] text-blue-200/50 uppercase">
          Apex Solution
        </p>
      </aside>

      <div
        className={cn(
          "relative flex flex-col items-center justify-center overflow-hidden bg-linear-to-br from-[#f5f9ff] via-[#eaf1fb] to-[#fdf3e3] px-4",
          compact ? "h-dvh py-4" : "min-h-dvh py-10",
        )}
      >
        <div
          aria-hidden
          className="auth-orb-a pointer-events-none absolute top-[-12%] left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-blue-500/20 blur-3xl"
        />
        <div
          aria-hidden
          className="auth-orb-b pointer-events-none absolute right-[-8%] bottom-[-16%] h-80 w-80 rounded-full bg-amber-400/25 blur-3xl"
        />
        <div
          aria-hidden
          className="auth-orb-b pointer-events-none absolute bottom-[-10%] left-[-10%] h-72 w-72 rounded-full bg-teal-400/20 blur-3xl"
        />
        <div className={cn("relative lg:hidden", compact ? "mb-3" : "mb-8")}>
          <BrandMark />
        </div>
        <div className="auth-rise relative z-10 flex w-full flex-col items-center">
          {children}
        </div>
      </div>
    </div>
  );
}
