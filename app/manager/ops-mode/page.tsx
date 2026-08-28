import { ClinicShell } from "@/components/clinic-shell";
import { ManagerOpsModePortal } from "@/components/manager/ManagerOpsModePortal";

export default function ManagerOpsModePage() {
  return (
    <ClinicShell
      title="Operating mode"
      subtitle="All mode changes go through Apex. Online → offline applies on approval; offline → online needs approval plus sync."
    >
      <ManagerOpsModePortal />
    </ClinicShell>
  );
}
