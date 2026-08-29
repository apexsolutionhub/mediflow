import { ClinicShellProvider } from "@/components/clinic-shell-provider";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <ClinicShellProvider>{children}</ClinicShellProvider>;
}
