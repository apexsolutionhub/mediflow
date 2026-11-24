import { ClinicShell } from "@/components/clinic-shell";
import { ManagerOpsModePortal } from "@/components/manager/ManagerOpsModePortal";

export default function ManagerOpsModePage() {
  return (
    <ClinicShell
      title="Operating mode"
      subtitle="All mode changes go through Apex. Going offline waits for the initial seed; going online waits for a final sync."
    >
      <ManagerOpsModePortal />
    </ClinicShell>
  );
}
