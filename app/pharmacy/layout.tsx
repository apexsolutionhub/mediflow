import { ClinicShellProvider } from "@/components/clinic-shell-provider";

export default function PharmacyLayout({ children }: { children: React.ReactNode }) {
  return <ClinicShellProvider>{children}</ClinicShellProvider>;
}
