import { ClinicShellProvider } from "@/components/clinic-shell-provider";

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  return <ClinicShellProvider>{children}</ClinicShellProvider>;
}
