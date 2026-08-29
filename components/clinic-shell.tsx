"use client";

import { ClinicPageMeta } from "@/components/clinic-page-meta";

/** Sets page title in the persistent clinic shell. Wrap content only — use inside a role layout. */
export function ClinicShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <>
      <ClinicPageMeta title={title} subtitle={subtitle} />
      {children}
    </>
  );
}

export { ClinicShellProvider } from "@/components/clinic-shell-provider";
