import { ClinicShellProvider } from "@/components/clinic-shell-provider";

export default function RadiologyLayout({ children }: { children: React.ReactNode }) {
  return <ClinicShellProvider>{children}</ClinicShellProvider>;
}
