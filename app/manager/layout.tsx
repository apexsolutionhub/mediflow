import { ClinicShellProvider } from "@/components/clinic-shell-provider";

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  return <ClinicShellProvider>{children}</ClinicShellProvider>;
}
