"use client";

import { useEffect, useState } from "react";

import { fetchSignupPricing, type SignupPricing } from "@/lib/signup-pricing";

/** Live Apex catalog fees (cached). Used when billing snapshot has stale defaults. */
export function useBillingCatalogPricing(): SignupPricing | null {
  const [catalog, setCatalog] = useState<SignupPricing | null>(null);

  useEffect(() => {
    let active = true;
    void fetchSignupPricing()
      .then((pricing) => {
        if (active) setCatalog(pricing);
      })
      .catch(() => {
        if (active) setCatalog(null);
      });
    return () => {
      active = false;
    };
  }, []);

  return catalog;
}
