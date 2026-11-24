import { ClinicShell } from "@/components/clinic-shell";
import { ManagerSyncPortal } from "@/components/manager/ManagerSyncPortal";

export default function ManagerSyncPage() {
  return (
    <ClinicShell
      title="Sync"
      subtitle="Keep the clinic server and the cloud in step. Push first, then pull; nothing counts as synced until both finish."
    >
      <ManagerSyncPortal />
    </ClinicShell>
  );
}
