"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { AuthShell } from "@/components/auth-shell";
import { BillingRenewalCard } from "@/components/auth/billing-renewal-card";

function BillingRenewalContent() {
  const searchParams = useSearchParams();
  const username = searchParams.get("username") || undefined;
  return <BillingRenewalCard initialUsername={username} />;
}

export default function BillingRenewalPage() {
  return (
    <AuthShell>
      <Suspense fallback={null}>
        <BillingRenewalContent />
      </Suspense>
    </AuthShell>
  );
}
