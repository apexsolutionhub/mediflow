"use client";

import { useLayoutEffect } from "react";

import { useClinicShellMeta } from "@/components/clinic-shell-provider";

export function ClinicPageMeta({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  const setMeta = useClinicShellMeta();

  useLayoutEffect(() => {
    setMeta({ title, subtitle });
  }, [setMeta, subtitle, title]);

  return null;
}
