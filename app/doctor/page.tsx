"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Active visits board removed — doctor home is Chart with an encounter selector. */
export default function DoctorHomeRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/doctor/chart");
  }, [router]);
  return null;
}
