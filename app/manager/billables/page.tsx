"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import {
  Building2,
  Check,
  ChevronDown,
  Pencil,
  Tags,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { ClinicShell } from "@/components/clinic-shell";
import CustomFormField, { formFieldTypes } from "@/components/customFormField";
import { DepartmentBatchForm } from "@/components/manager/DepartmentBatchForm";
import { ServiceBatchForm } from "@/components/manager/ServiceBatchForm";
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
import { SubmitButton } from "@/components/ui/submit-button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ctaButtonClass,
  EmptyState,
  QueueItem,
  SectionCard,
  StatTile,
  StatusPill,
} from "@/components/ui-chrome";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { fetchClinicCatalog } from "@/lib/hooks/use-clinic-catalog";
import {
  BILLABLE_SERVICE_TYPES,
  type BillableService,
  type Department,
  money,
} from "@/lib/clinic";

type ServiceFormValues = {
  code: string;
  name: string;
  description: string;
  department: string;
  service_type: string;
  unit_price: number;
  default_quantity: number;
  is_active: boolean;
  auto_add_on_registration: boolean;
  requires_payment_before_work: boolean;
  internal_notes: string;
};

const hiddenScrollbarClass =
  "overflow-y-auto overscroll-contain scrollbar-none [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

/** Scroll when more than 3 catalog rows (~3 QueueItems + gaps). */
function catalogListScrollClass(itemCount: number) {
  return itemCount > 3 ? cn(hiddenScrollbarClass, "max-h-[21rem]") : undefined;
}

/** Scroll when more than 2 rows of department map cards. */
function departmentMapScrollClass(itemCount: number) {
  if (itemCount <= 2) return undefined;
  return cn(
    hiddenScrollbarClass,
    "max-h-[13.5rem]",
    itemCount <= 4 && "sm:max-h-none sm:overflow-visible",
  );
}

const defaultServiceValues = (): ServiceFormValues => ({
  code: "",
  name: "",
  description: "",
  department: "",
  service_type: "other",
  unit_price: 100,
  default_quantity: 1,
  is_active: true,
  auto_add_on_registration: false,
  requires_payment_before_work: true,
  internal_notes: "",
});

function serviceTypeLabel(value: string) {
  return BILLABLE_SERVICE_TYPES.find((t) => t.value === value)?.label ?? value;
}

function serviceToFormValues(s: BillableService): ServiceFormValues {
  return {
    code: s.code,
    name: s.name,
    description: s.description ?? "",
    department: s.department,
    service_type: s.service_type || "other",
    unit_price: Number(s.unit_price),
    default_quantity: s.default_quantity ?? 1,
    is_active: s.is_active !== false,
    auto_add_on_registration: Boolean(s.auto_add_on_registration),
    requires_payment_before_work: s.requires_payment_before_work !== false,
    internal_notes: s.internal_notes ?? "",
  };
}

function BillablesCollapsibleSection({
  open,
  onOpenChange,
  kicker,
  title,
  description,
  action,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kicker?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <section className="clinic-panel clinic-panel-glow overflow-hidden rounded-3xl">
        <CollapsibleTrigger
          type="button"
          className="flex w-full cursor-pointer items-start justify-between gap-3 border-b border-primary/8 bg-linear-to-r from-primary/4 via-transparent to-cta/5 px-5 py-4 text-left transition-colors hover:from-primary/6 data-[state=closed]:border-b-0"
        >
          <div className="min-w-0 space-y-1">
            {kicker ? <p className="clinic-kicker">{kicker}</p> : null}
            <h2 className="font-heading text-xl font-semibold text-primary">{title}</h2>
            {description ? (
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2 pt-0.5">
            {action}
            <ChevronDown
              className={cn(
                "size-5 text-primary/60 transition-transform duration-200",
                open && "rotate-180",
              )}
            />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-none">
          <div className="flex flex-col gap-6 p-5">{children}</div>
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}

export default function ManagerBillablesPage() {
  const [services, setServices] = useState<BillableService[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [editingDeptId, setEditingDeptId] = useState<number | null>(null);
  const [editDeptName, setEditDeptName] = useState("");
  const [savingDeptId, setSavingDeptId] = useState<number | null>(null);
  const [pendingDeleteDept, setPendingDeleteDept] = useState<Department | null>(null);
  const [deletingDeptId, setDeletingDeptId] = useState<number | null>(null);
  const [editingServiceId, setEditingServiceId] = useState<number | null>(null);
  const [pendingDeleteService, setPendingDeleteService] = useState<BillableService | null>(null);
  const [deletingServiceId, setDeletingServiceId] = useState<number | null>(null);
  const [savingService, setSavingService] = useState(false);
  const [departmentsOpen, setDepartmentsOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [preferredServiceDepartment, setPreferredServiceDepartment] = useState("");

  const serviceForm = useForm<ServiceFormValues>({
    defaultValues: defaultServiceValues(),
  });

  const activeDepartments = useMemo(
    () => departments.filter((d) => d.is_active !== false),
    [departments],
  );

  const departmentOptions = useMemo(
    () => activeDepartments.map((d) => ({ label: d.name, value: d.name })),
    [activeDepartments],
  );

  const servicesByDepartment = useMemo(() => {
    const map = new Map<string, number>();
    for (const svc of services) {
      map.set(svc.department, (map.get(svc.department) ?? 0) + 1);
    }
    return map;
  }, [services]);

  const load = useCallback(async (force = false) => {
    const [svc, depts] = await Promise.all([
      fetchClinicCatalog<BillableService>("services", "/clinic/services/", { page_size: 100 }, force),
      fetchClinicCatalog<Department>("departments", "/clinic/departments/", { page_size: 50 }, force),
    ]);
    setServices(svc);
    setDepartments(depts);
  }, []);

  useEffect(() => {
    load().catch(() => toast.error("Could not load catalog"));
  }, [load]);

  useEffect(() => {
    const current = serviceForm.getValues("department");
    if (activeDepartments.length === 0) {
      if (current) serviceForm.setValue("department", "");
      return;
    }
    if (!activeDepartments.some((d) => d.name === current)) {
      serviceForm.setValue("department", activeDepartments[0].name);
    }
  }, [activeDepartments, serviceForm]);

  const resetServiceForm = () => {
    serviceForm.reset({
      ...defaultServiceValues(),
      department: activeDepartments[0]?.name ?? "",
    });
    setEditingServiceId(null);
  };

  const startEditService = (service: BillableService) => {
    setServicesOpen(true);
    setEditingServiceId(service.id);
    serviceForm.reset(serviceToFormValues(service));
    requestAnimationFrame(() => {
      document.getElementById("billable-service-form")?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    });
  };

  const saveService = async (values: ServiceFormValues) => {
    const payload = {
      ...values,
      unit_price: Number(values.unit_price),
      default_quantity: Math.max(1, Number(values.default_quantity) || 1),
    };
    setSavingService(true);
    try {
      if (editingServiceId) {
        await api.patch(`/clinic/services/${editingServiceId}/`, payload);
        toast.success("Service updated");
      } else {
        await api.post("/clinic/services/", payload);
        toast.success("Service added");
      }
      resetServiceForm();
      await load(true);
    } catch (error: unknown) {
      toast.error(
        String(
          (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
            "Could not save service",
        ),
      );
    } finally {
      setSavingService(false);
    }
  };

  const confirmDeleteService = async () => {
    const service = pendingDeleteService;
    if (!service) return;
    setDeletingServiceId(service.id);
    try {
      await api.delete(`/clinic/services/${service.id}/`);
      toast.success("Service deleted");
      setPendingDeleteService(null);
      if (editingServiceId === service.id) resetServiceForm();
      await load(true);
    } catch (error: unknown) {
      toast.error(
        String(
          (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
            "Could not delete service",
        ),
      );
    } finally {
      setDeletingServiceId(null);
    }
  };

  const startEditDepartment = (dept: Department) => {
    setDepartmentsOpen(true);
    setEditingDeptId(dept.id);
    setEditDeptName(dept.name);
  };

  const cancelEditDepartment = () => {
    setEditingDeptId(null);
    setEditDeptName("");
  };

  const saveDepartment = async (dept: Department) => {
    const name = editDeptName.trim();
    if (!name) {
      toast.error("Department name is required");
      return;
    }
    if (name === dept.name) {
      cancelEditDepartment();
      return;
    }
    setSavingDeptId(dept.id);
    try {
      await api.patch(`/clinic/departments/${dept.id}/`, { name });
      toast.success("Department updated");
      cancelEditDepartment();
      await load(true);
    } catch (error: unknown) {
      toast.error(
        String(
          (error as { response?: { data?: { detail?: string; name?: string[] } } })?.response
            ?.data?.name?.[0] ||
            (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
            "Could not update department",
        ),
      );
    } finally {
      setSavingDeptId(null);
    }
  };

  const confirmDeleteDepartment = async () => {
    const dept = pendingDeleteDept;
    if (!dept) return;
    setDeletingDeptId(dept.id);
    try {
      await api.delete(`/clinic/departments/${dept.id}/`);
      toast.success("Department deleted");
      setPendingDeleteDept(null);
      if (editingDeptId === dept.id) cancelEditDepartment();
      await load(true);
    } catch (error: unknown) {
      toast.error(
        String(
          (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
            "Could not delete department",
        ),
      );
    } finally {
      setDeletingDeptId(null);
    }
  };

  const autoAddService = services.find(
    (s) => s.auto_add_on_registration && s.id !== editingServiceId,
  );

  const activeServiceCount = useMemo(
    () => services.filter((s) => s.is_active !== false).length,
    [services],
  );

  const selectedDepartment =
    preferredServiceDepartment || serviceForm.watch("department");

  const focusDepartmentInServiceForm = (deptName: string) => {
    setServicesOpen(true);
    setPreferredServiceDepartment(deptName);
    serviceForm.setValue("department", deptName);
    requestAnimationFrame(() => {
      document.getElementById("billable-service-form")?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    });
  };

  return (
    <ClinicShell
      title="Billable catalog"
      subtitle="Services and departments reception charges against."
    >
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatTile label="Billable services" value={services.length} tone="navy" />
        <StatTile label="Departments" value={activeDepartments.length} tone="green" />
        <StatTile label="Active catalog" value={activeServiceCount} tone="orange" />
      </div>

      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <BillablesCollapsibleSection
          open={departmentsOpen}
          onOpenChange={setDepartmentsOpen}
          kicker="Structure"
          title="Departments"
          description="Organize billable services by clinic department — expand to add, edit, or remove."
          action={
            <div className="flex flex-wrap items-center justify-end gap-2">
              <StatusPill tone="green">{departments.length} total</StatusPill>
              {activeDepartments.length > 0 ? (
                <StatusPill tone="navy">{activeDepartments.length} active</StatusPill>
              ) : null}
            </div>
          }
        >
          {activeDepartments.length > 0 ? (
            <SectionCard
              kicker="Overview"
              title="Department map"
              description="Tap a department to pre-select it when adding a billable service."
              action={
                autoAddService ? (
                  <StatusPill tone="orange">Auto-add: {autoAddService.name}</StatusPill>
                ) : undefined
              }
            >
              <div className={departmentMapScrollClass(activeDepartments.length)}>
                <div className="grid gap-3 sm:grid-cols-2">
                  {activeDepartments.map((dept) => {
                  const count = servicesByDepartment.get(dept.name) ?? 0;
                  const selected = selectedDepartment === dept.name;
                  return (
                    <button
                      key={dept.id}
                      type="button"
                      onClick={() => focusDepartmentInServiceForm(dept.name)}
                      className={cn(
                        "group relative overflow-hidden rounded-3xl border px-4 py-4 text-left transition-all duration-200",
                        selected
                          ? "border-cta/45 bg-linear-to-br from-amber-50/90 to-white shadow-md shadow-amber-100/50"
                          : "cursor-pointer border-primary/10 bg-linear-to-br from-white to-primary/4 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
                          <Building2 className="size-4.5" />
                        </span>
                        <StatusPill tone={count > 0 ? "green" : "muted"}>
                          {count} service{count === 1 ? "" : "s"}
                        </StatusPill>
                      </div>
                      <p className="mt-3 font-heading text-sm font-semibold text-primary">{dept.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {selected ? "Selected for new service" : "Click to use in service form"}
                      </p>
                    </button>
                  );
                })}
                </div>
              </div>
            </SectionCard>
          ) : null}

          <SectionCard
          id="billable-dept-form"
          kicker="Structure"
          title="Add departments"
          description="Add one or many departments in a single submit — groups billable services for reception and doctor orders."
        >
          <DepartmentBatchForm onSaved={() => load(true)} />
        </SectionCard>

        <SectionCard
          kicker="Live catalog"
          title="Departments"
          description="Rename or remove unused departments — linked services must be moved first."
          action={<StatusPill tone="green">{departments.length} total</StatusPill>}
        >
          {departments.length === 0 ? (
            <EmptyState
              title="No departments yet"
              hint="Add your first department above before creating billable services."
            />
          ) : (
            <>
              <div className={catalogListScrollClass(departments.length)}>
                <div className="space-y-3 pr-1">
                  {departments.map((d) => {
                    const inUse = (servicesByDepartment.get(d.name) ?? 0) > 0;
                    const isEditing = editingDeptId === d.id;
                    const serviceCount = servicesByDepartment.get(d.name) ?? 0;
                    return (
                      <QueueItem
                        key={d.id}
                        className={cn(
                          inUse && "border-emerald-200/60 bg-linear-to-r from-emerald-50/30 to-white",
                          isEditing && "border-cta/35 bg-cta/5 shadow-md shadow-cta/10",
                        )}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex min-w-0 flex-1 items-center gap-3">
                            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
                              <Building2 className="size-4.5" />
                            </span>
                            {isEditing ? (
                              <Input
                                value={editDeptName}
                                onChange={(e) => setEditDeptName(e.target.value)}
                                className="h-11 max-w-xs rounded-xl"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    void saveDepartment(d);
                                  }
                                  if (e.key === "Escape") cancelEditDepartment();
                                }}
                              />
                            ) : (
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="truncate font-heading font-semibold text-primary">
                                    {d.name}
                                  </p>
                                  {d.is_active === false ? (
                                    <StatusPill tone="muted">Inactive</StatusPill>
                                  ) : null}
                                  <StatusPill tone={serviceCount > 0 ? "green" : "muted"}>
                                    {serviceCount} linked
                                  </StatusPill>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {inUse
                                    ? "Services bill under this department"
                                    : "Safe to delete when empty"}
                                </p>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            {isEditing ? (
                              <>
                                <Button
                                  type="button"
                                  size="icon-sm"
                                  className="rounded-xl"
                                  disabled={savingDeptId === d.id}
                                  onClick={() => void saveDepartment(d)}
                                >
                                  <Check className="size-4" />
                                  <span className="sr-only">Save</span>
                                </Button>
                                <Button
                                  type="button"
                                  size="icon-sm"
                                  variant="outline"
                                  className="rounded-xl"
                                  onClick={cancelEditDepartment}
                                >
                                  <X className="size-4" />
                                  <span className="sr-only">Cancel</span>
                                </Button>
                              </>
                            ) : (
                              <>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      type="button"
                                      size="icon-sm"
                                      variant="outline"
                                      className="rounded-xl"
                                      onClick={() => startEditDepartment(d)}
                                    >
                                      <Pencil className="size-4" />
                                      <span className="sr-only">Edit {d.name}</span>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Edit name</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      type="button"
                                      size="icon-sm"
                                      variant="outline"
                                      className="rounded-xl border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                                      onClick={() => setPendingDeleteDept(d)}
                                    >
                                      <Trash2 className="size-4" />
                                      <span className="sr-only">Delete {d.name}</span>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {inUse ? "Remove linked services first" : "Delete department"}
                                  </TooltipContent>
                                </Tooltip>
                              </>
                            )}
                          </div>
                        </div>
                      </QueueItem>
                    );
                  })}
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-2xl border border-primary/10 bg-slate-50/80 px-4 py-3 text-xs text-muted-foreground">
                <Building2 className="size-4 shrink-0 text-primary/70" />
                Renaming a department updates every linked billable service automatically.
              </div>
            </>
          )}
        </SectionCard>
        </BillablesCollapsibleSection>

        <BillablesCollapsibleSection
          open={servicesOpen}
          onOpenChange={setServicesOpen}
          kicker="Catalog"
          title="Billable services"
          description="Reception and doctors charge against these codes — expand to add, edit, or review the live catalog."
          action={
            <div className="flex flex-wrap items-center justify-end gap-2">
              <StatusPill tone="navy">{services.length} services</StatusPill>
              {editingServiceId ? <StatusPill tone="orange">Editing</StatusPill> : null}
              {activeServiceCount > 0 ? (
                <StatusPill tone="green">{activeServiceCount} active</StatusPill>
              ) : null}
            </div>
          }
        >
        <SectionCard
          id="billable-service-form"
          kicker="Catalog"
          title={editingServiceId ? "Edit billable service" : "Add billable services"}
          description={
            editingServiceId
              ? "Update catalog details — changes apply to new orders and cashier entries."
              : "Add one or many services in a single submit. Reception and doctors charge against these codes."
          }
          action={
            editingServiceId ? (
              <StatusPill tone="orange">Editing</StatusPill>
            ) : undefined
          }
        >
          {activeDepartments.length === 0 ? (
            <EmptyState
              title="Add a department first"
              hint="Create a department above before adding billable services."
            />
          ) : editingServiceId ? (
            <form className="grid gap-5" onSubmit={serviceForm.handleSubmit(saveService)}>
              <div className="flex items-start gap-3 rounded-2xl border border-primary/10 bg-linear-to-r from-primary/5 via-transparent to-cta/5 px-4 py-4">
                <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
                  <Tags className="size-5" />
                </span>
                <div>
                  <p className="font-heading text-sm font-semibold text-primary">Billable line item</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Cashier totals use unit price × default quantity. One service can auto-add when
                    reception registers a patient.
                  </p>
                </div>
              </div>

              <CustomFormField
                control={serviceForm.control}
                name="name"
                fieldType={formFieldTypes.INPUT}
                label="Service name"
                placeholder="e.g. General consultation"
              />
              <CustomFormField
                control={serviceForm.control}
                name="description"
                fieldType={formFieldTypes.TEXTAREA}
                label="Description (patient-facing)"
                placeholder="Shown on cashier and receipts"
                description="Longer label reception sees when collecting payment."
              />

              <div className="rounded-2xl border border-primary/10 bg-slate-50/60 p-4">
                <p className="mb-4 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Pricing & code
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <CustomFormField
                    control={serviceForm.control}
                    name="code"
                    fieldType={formFieldTypes.INPUT}
                    label="Code"
                    placeholder="CONSULT"
                    description="Short unique ID for this clinic."
                  />
                  <CustomFormField
                    control={serviceForm.control}
                    name="unit_price"
                    fieldType={formFieldTypes.INPUT}
                    type="number"
                    label="Unit price (ETB)"
                    description="Price per unit before quantity."
                  />
                  <CustomFormField
                    control={serviceForm.control}
                    name="default_quantity"
                    fieldType={formFieldTypes.INPUT}
                    type="number"
                    label="Default quantity"
                    description="Applied when the service is added to a visit."
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-primary/10 bg-slate-50/60 p-4">
                <p className="mb-4 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Classification
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <CustomFormField
                    control={serviceForm.control}
                    name="department"
                    fieldType={formFieldTypes.SELECT}
                    label="Department"
                    options={departmentOptions}
                  />
                  <CustomFormField
                    control={serviceForm.control}
                    name="service_type"
                    fieldType={formFieldTypes.SELECT}
                    label="Service type"
                    options={BILLABLE_SERVICE_TYPES.map((t) => ({
                      label: t.label,
                      value: t.value,
                    }))}
                    description="Used to filter doctor orders."
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-primary/10 bg-slate-50/60 p-4">
                <p className="mb-4 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Workflow rules
                </p>
                <div className="grid gap-4">
                  <CustomFormField
                    control={serviceForm.control}
                    name="is_active"
                    fieldType={formFieldTypes.SWITCH}
                    label="Active in catalog"
                    description="Inactive services are hidden from new orders."
                  />
                  <CustomFormField
                    control={serviceForm.control}
                    name="auto_add_on_registration"
                    fieldType={formFieldTypes.SWITCH}
                    label="Auto-add on registration"
                    description={
                      autoAddService
                        ? `Currently: ${autoAddService.name}. Enabling replaces the existing auto-add service.`
                        : "Adds this line when reception opens a new encounter (one per clinic)."
                    }
                  />
                  <CustomFormField
                    control={serviceForm.control}
                    name="requires_payment_before_work"
                    fieldType={formFieldTypes.SWITCH}
                    label="Requires payment before clinical work"
                    description="When off, orders using this service skip the payment queue."
                  />
                </div>
              </div>

              <CustomFormField
                control={serviceForm.control}
                name="internal_notes"
                fieldType={formFieldTypes.TEXTAREA}
                label="Internal notes (staff only)"
                placeholder="Manager reminders — not shown to patients"
              />

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="h-11 rounded-xl"
                  disabled={savingService}
                  onClick={resetServiceForm}
                >
                  <X className="size-4" />
                  Cancel edit
                </Button>
                <SubmitButton
                  size="lg"
                  disabled={savingService}
                  className={cn("w-full sm:w-auto", ctaButtonClass)}
                  loading={savingService}
                  loadingLabel="Updating…"
                >
                  <Check className="size-4" />
                  Update service
                </SubmitButton>
              </div>
            </form>
          ) : (
            <ServiceBatchForm
              departmentOptions={departmentOptions}
              defaultDepartment={activeDepartments[0]?.name ?? ""}
              preferredDepartment={preferredServiceDepartment}
              autoAddHint={
                autoAddService
                  ? `Currently: ${autoAddService.name}. Enabling replaces the existing auto-add service.`
                  : undefined
              }
              onSaved={() => load(true)}
            />
          )}
        </SectionCard>

        <SectionCard
          kicker="Live catalog"
          title="Billable services"
          description="What reception sees when collecting payment — edit or deactivate from here."
          action={<StatusPill tone="navy">{services.length} services</StatusPill>}
        >
          {services.length === 0 ? (
            <EmptyState
              title="No services yet"
              hint="Add a department, then create your first billable service above."
            />
          ) : (
            <>
              <div className={catalogListScrollClass(services.length)}>
                <div className="space-y-3 pr-1">
                  {services.map((s) => {
                    const inactive = s.is_active === false;
                    const isEditing = editingServiceId === s.id;
                    const lineTotal =
                      Number(s.unit_price) * (s.default_quantity && s.default_quantity > 1 ? s.default_quantity : 1);
                    return (
                      <QueueItem
                        key={s.id}
                        className={cn(
                          inactive && "opacity-60",
                          s.auto_add_on_registration &&
                            "border-amber-200/70 bg-linear-to-r from-amber-50/40 to-white",
                          isEditing && "border-cta/35 bg-cta/5 shadow-md shadow-cta/10",
                        )}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex min-w-0 flex-1 items-start gap-3">
                            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
                              <Tags className="size-4.5" />
                            </span>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-heading font-semibold text-primary">{s.name}</p>
                                {inactive ? <StatusPill tone="muted">Inactive</StatusPill> : null}
                                {s.auto_add_on_registration ? (
                                  <StatusPill tone="orange">On registration</StatusPill>
                                ) : null}
                                {isEditing ? <StatusPill tone="orange">Editing</StatusPill> : null}
                              </div>
                              {s.description ? (
                                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                  {s.description}
                                </p>
                              ) : null}
                              <p className="mt-1 text-xs text-muted-foreground">
                                {s.code} · {s.department} ·{" "}
                                {serviceTypeLabel(s.service_type || "other")}
                                {s.default_quantity && s.default_quantity > 1
                                  ? ` · qty ${s.default_quantity}`
                                  : ""}
                              </p>
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-2">
                            <div className="text-right">
                              <span className="font-heading text-lg font-semibold text-primary">
                                {money(s.unit_price)} ETB
                              </span>
                              {s.default_quantity && s.default_quantity > 1 ? (
                                <p className="text-[11px] text-muted-foreground">
                                  {money(lineTotal)} ETB line total
                                </p>
                              ) : null}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    size="icon-sm"
                                    variant="outline"
                                    className="rounded-xl"
                                    onClick={() => startEditService(s)}
                                  >
                                    <Pencil className="size-4" />
                                    <span className="sr-only">Edit {s.name}</span>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit service</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    size="icon-sm"
                                    variant="outline"
                                    className="rounded-xl border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                                    onClick={() => setPendingDeleteService(s)}
                                  >
                                    <Trash2 className="size-4" />
                                    <span className="sr-only">Delete {s.name}</span>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete service</TooltipContent>
                              </Tooltip>
                            </div>
                          </div>
                        </div>
                      </QueueItem>
                    );
                  })}
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-2xl border border-primary/10 bg-slate-50/80 px-4 py-3 text-xs text-muted-foreground">
                <Tags className="size-4 shrink-0 text-primary/70" />
                Default quantity sets how many units reception adds when this service attaches to a visit.
              </div>
            </>
          )}
        </SectionCard>
        </BillablesCollapsibleSection>
      </div>

      <AlertDialog
        open={pendingDeleteDept != null}
        onOpenChange={(open) => {
          if (!open && deletingDeptId == null) setPendingDeleteDept(null);
        }}
      >
        <AlertDialogContent size="default" className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-rose-50 text-rose-700">
              <Trash2 />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete department?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes{" "}
              <span className="font-medium text-foreground">{pendingDeleteDept?.name}</span> from
              your clinic structure. Departments with linked billable services cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingDeptId != null}>Keep</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deletingDeptId != null}
              onClick={(event) => {
                event.preventDefault();
                void confirmDeleteDepartment();
              }}
            >
              {deletingDeptId != null ? "Deleting…" : "Delete department"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={pendingDeleteService != null}
        onOpenChange={(open) => {
          if (!open && deletingServiceId == null) setPendingDeleteService(null);
        }}
      >
        <AlertDialogContent size="default" className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-rose-50 text-rose-700">
              <Trash2 />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete billable service?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes{" "}
              <span className="font-medium text-foreground">{pendingDeleteService?.name}</span>{" "}
              from the catalog. Services linked to past billable items or used for auto-registration
              cannot be deleted — deactivate them instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingServiceId != null}>Keep</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deletingServiceId != null}
              onClick={(event) => {
                event.preventDefault();
                void confirmDeleteService();
              }}
            >
              {deletingServiceId != null ? "Deleting…" : "Delete service"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ClinicShell>
  );
}
