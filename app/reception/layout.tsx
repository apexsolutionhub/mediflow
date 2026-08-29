import { ClinicShellProvider } from "@/components/clinic-shell-provider";

export default function ReceptionLayout({ children }: { children: React.ReactNode }) {
  return <ClinicShellProvider>{children}</ClinicShellProvider>;
}
