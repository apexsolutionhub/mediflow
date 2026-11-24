"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Truck } from "lucide-react";
import { toast } from "sonner";

import { ClinicShell } from "@/components/clinic-shell";
import { SupplierDialog } from "@/components/manager/SupplierDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { EmptyState, QueueItem, SectionCard, StatTile } from "@/components/ui-chrome";
import { api } from "@/lib/api";
import type { Supplier } from "@/lib/clinic";
import { apiErrorDetail } from "@/lib/parallelBatch";

export default function ManagerSuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Supplier | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    const { data } = await api.get("/clinic/suppliers/", { params: { page_size: 200 } });
    setSuppliers(Array.isArray(data) ? data : (data.results ?? []));
    setLoaded(true);
  }, []);

  useEffect(() => {
    load().catch(() => toast.error("Could not load suppliers"));
  }, [load]);

  const confirmDelete = async () => {
    const supplier = pendingDelete;
    if (!supplier) return;
    setDeletingId(supplier.id);
    try {
      await api.delete(`/clinic/suppliers/${supplier.id}/`);
      toast.success("Supplier removed");
      await load();
    } catch (error) {
      toast.error(apiErrorDetail(error, "Could not remove supplier"));
    } finally {
      setDeletingId(null);
      setPendingDelete(null);
    }
  };

  const lines = suppliers.reduce((sum, s) => sum + (s.medicine_count ?? 0), 0);

  return (
    <ClinicShell title="Suppliers" subtitle="Who you buy stock from. Pick them when you register medicines.">
      <div className="flex w-full flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <StatTile label="Suppliers" value={suppliers.length} tone="navy" />
          <StatTile label="Medicine lines supplied" value={lines} tone="green" />
        </div>

        <SectionCard
          kicker="Purchasing"
          title="Supplier list"
          description="Each medicine line is linked to one supplier."
          action={
            <Button type="button" size="sm" variant="outline" className="h-9 rounded-xl" onClick={() => setDialogOpen(true)}>
              <Plus className="size-4" />
              New supplier
            </Button>
          }
        >
          {loaded && suppliers.length === 0 ? (
            <EmptyState
              title="No suppliers yet"
              hint="Add a supplier before registering medicines."
              icon={<Truck className="size-5" />}
            />
          ) : (
            <div className="grid gap-3 @container sm:grid-cols-2">
              {suppliers.map((s) => (
                <QueueItem key={s.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-(--role) to-(--role-2) text-white shadow-md shadow-(--role)/25">
                        <Truck className="size-4.5" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-heading font-semibold text-primary">{s.supplier_name}</p>
                        <p className="text-xs text-muted-foreground">{s.supplier_phone}</p>
                        {s.supplier_email ? (
                          <p className="truncate text-xs text-muted-foreground">{s.supplier_email}</p>
                        ) : null}
                        <p className="mt-1 text-[11px] font-semibold text-primary/70">
                          {s.medicine_count ?? 0} medicine line{s.medicine_count === 1 ? "" : "s"}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="outline"
                      className="shrink-0 rounded-xl border-rose-200 text-rose-700 hover:bg-rose-50"
                      onClick={() => setPendingDelete(s)}
                    >
                      <Trash2 className="size-4" />
                      <span className="sr-only">Remove {s.supplier_name}</span>
                    </Button>
                  </div>
                </QueueItem>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <SupplierDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onCreated={load} />

      <AlertDialog
        open={pendingDelete != null}
        onOpenChange={(open) => (!open && deletingId == null ? setPendingDelete(null) : undefined)}
      >
        <AlertDialogContent size="default" className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-rose-50 text-rose-700">
              <Truck />
            </AlertDialogMedia>
            <AlertDialogTitle>Remove supplier?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground">{pendingDelete?.supplier_name}</span> will be removed. A
              supplier that still has medicine lines can&apos;t be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingId != null}>Keep</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deletingId != null}
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
            >
              {deletingId != null ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ClinicShell>
  );
}
