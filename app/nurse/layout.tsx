import { ClinicShellProvider } from "@/components/clinic-shell-provider";

export default function NurseLayout({ children }: { children: React.ReactNode }) {
  return <ClinicShellProvider>{children}</ClinicShellProvider>;
}
