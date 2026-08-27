import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const AUTH_CARD =
  "auth-shimmer relative w-full max-w-[28rem] overflow-hidden rounded-2xl border border-primary/10 bg-white shadow-[0_24px_80px_-28px_rgba(30,58,138,0.35)] ring-1 ring-primary/10";

export const AUTH_BAND =
  "border-primary/10 bg-linear-to-r from-primary/10 via-white to-cta/10";

export const AUTH_PANEL_NAVY =
  "rounded-2xl border border-primary/15 bg-linear-to-br from-primary/10 via-white to-primary/5 p-4";

export const AUTH_PANEL_ORANGE =
  "rounded-2xl border border-cta/20 bg-linear-to-br from-cta/10 via-white to-orange-50 p-4";

function BrandMark({ light = false }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "auth-mark-glow flex size-12 items-center justify-center rounded-xl bg-linear-to-br from-cta to-orange-600 font-heading text-lg font-bold text-white",
        )}
      >
        MF
      </div>
      <div className="leading-tight">
        <p
          className={cn(
            "font-heading text-[1.35rem] font-extrabold tracking-[0.18em]",
            light ? "text-white" : "text-primary",
          )}
        >
          MEDIFLOW
        </p>
        <p
          className={cn(
            "mt-0.5 text-[11px] font-semibold tracking-[0.16em] uppercase",
            light ? "text-blue-200" : "text-cta",
          )}
        >
          Clinical operations
        </p>
      </div>
    </div>
  );
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
          className="auth-orb-b pointer-events-none absolute right-[-20%] -bottom-16 h-72 w-72 rounded-full bg-sky-300/20 blur-3xl"
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
        </div>
        <p className="auth-rise auth-delay-3 relative text-xs tracking-[0.18em] text-blue-200/50 uppercase">
          Apex Solution
        </p>
      </aside>

      <div
        className={cn(
          "relative flex flex-col items-center justify-center overflow-hidden bg-background px-4",
          compact ? "h-dvh py-4" : "min-h-dvh py-10",
        )}
      >
        <div
          aria-hidden
          className="auth-orb-a pointer-events-none absolute top-[-12%] left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
        />
        <div
          aria-hidden
          className="auth-orb-b pointer-events-none absolute right-[-8%] bottom-[-16%] h-80 w-80 rounded-full bg-cta/10 blur-3xl"
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
