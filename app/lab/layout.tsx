import { ClinicShellProvider } from "@/components/clinic-shell-provider";

export default function LabLayout({ children }: { children: React.ReactNode }) {
  return <ClinicShellProvider>{children}</ClinicShellProvider>;
}
