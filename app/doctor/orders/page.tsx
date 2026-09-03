"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Orders are nested: Laboratory / Radiology / Pharmacy prescription. */
export default function DoctorOrdersRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/doctor/orders/laboratory");
  }, [router]);
  return null;
}
