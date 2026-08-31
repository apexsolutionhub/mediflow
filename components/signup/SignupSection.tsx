import type { ReactNode } from "react";

import { AUTH_MUTED, AUTH_PANEL_NAVY, AUTH_PANEL_ORANGE } from "@/components/auth-shell";
import { cn } from "@/lib/utils";

export function SignupSection({
  title,
  description,
  children,
  tone = "warm",
}: {
  title: string;
  description?: string;
  children: ReactNode;
  tone?: "warm" | "cool";
}) {
  return (
    <section
      className={cn(
        "space-y-4",
        tone === "cool" ? AUTH_PANEL_NAVY : AUTH_PANEL_ORANGE,
      )}
    >
      <div className="space-y-1">
        <h2
          className={cn(
            "text-sm font-semibold tracking-wide uppercase",
            tone === "cool" ? "text-primary" : "text-cta",
          )}
        >
          {title}
        </h2>
        {description ? (
          <p className={cn("text-sm text-pretty", AUTH_MUTED)}>{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
