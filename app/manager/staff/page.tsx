"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import {
  CheckCircle2,
  FlaskConical,
  HeartPulse,
  KeyRound,
  Pill,
  ScanLine,
  Shield,
  Stethoscope,
  Trash2,
  UserPlus,
  UserRound,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { ClinicShell } from "@/components/clinic-shell";
import CustomFormField, { formFieldTypes } from "@/components/customFormField";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
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
import { api, results } from "@/lib/api";

type StaffRow = { id: number; username: string; role: string; is_active?: boolean };

type StaffFormValues = {
  username: string;
  role: string;
  password: string;
  confirm_password: string;
};

const catalogScrollClass =
  "max-h-[32rem] overflow-y-auto overscroll-contain scrollbar-none [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

const ALL_STAFF_ROLES = [
  { label: "Reception", value: "reception", icon: UserRound, tone: "navy" as const },
  { label: "Doctor", value: "doctor", icon: Stethoscope, tone: "orange" as const },
  { label: "Nurse", value: "nurse", icon: HeartPulse, tone: "green" as const },
  { label: "Lab", value: "lab", icon: FlaskConical, tone: "navy" as const },
  { label: "Radiology", value: "radiology", icon: ScanLine, tone: "navy" as const },
  { label: "Pharmacist", value: "pharmacist", icon: Pill, tone: "orange" as const },
] as const;

function initials(username: string) {
  return username
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

function roleMeta(role: string) {
  const key = role.toLowerCase();
  return (
    ALL_STAFF_ROLES.find((r) => r.value === key) ?? {
      label: role,
      value: key,
      icon: Shield,
      tone: "muted" as const,
    }
  );
}

function roleTone(role: string): "navy" | "orange" | "green" | "muted" {
  const key = role.toLowerCase();
  if (key === "manager") return "navy";
  if (key === "doctor" || key === "pharmacist") return "orange";
  if (key === "nurse") return "green";
  return "navy";
}

export default function ManagerStaffPage() {
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<StaffRow | null>(null);
  const staffForm = useForm<StaffFormValues>({
    defaultValues: {
      username: "",
      role: "reception",
      password: "",
      confirm_password: "",
    },
  });

  const load = useCallback(async () => {
    const users = await api.get("/user/", { params: { page_size: 100 } });
    setStaff(results<StaffRow>(users.data));
  }, []);

  useEffect(() => {
    load().catch(() => toast.error("Could not load staff", { id: "staff-load" }));
  }, [load]);

  const staffByRole = useMemo(() => {
    const map = new Map<string, StaffRow>();
    for (const person of staff) {
      const role = (person.role || "").toLowerCase();
      if (role && person.is_active !== false) map.set(role, person);
    }
    return map;
  }, [staff]);

  const clinicalStaff = useMemo(
    () => staff.filter((p) => (p.role || "").toLowerCase() !== "manager"),
    [staff],
  );

  const managers = useMemo(
    () => staff.filter((p) => (p.role || "").toLowerCase() === "manager"),
    [staff],
  );

  const takenRoles = useMemo(() => new Set(staffByRole.keys()), [staffByRole]);

  const availableRoles = useMemo(
    () => ALL_STAFF_ROLES.filter((role) => !takenRoles.has(role.value)),
    [takenRoles],
  );

  const openSlots = availableRoles.length;

  useEffect(() => {
    const current = staffForm.getValues("role");
    if (availableRoles.length === 0) return;
    if (!availableRoles.some((role) => role.value === current)) {
      staffForm.setValue("role", availableRoles[0].value);
    }
  }, [availableRoles, staffForm]);

  const createStaff = async (values: StaffFormValues) => {
    if (values.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (values.password !== values.confirm_password) {
      toast.error("Password and confirmation do not match");
      return;
    }
    try {
      setCreating(true);
      await api.post("/user/", {
        username: values.username,
        password: values.password,
        role: values.role,
      });
      toast.success("Staff credential created");
      staffForm.reset({
        username: "",
        password: "",
        confirm_password: "",
        role: availableRoles.find((r) => r.value !== values.role)?.value || availableRoles[0]?.value || "",
      });
      await load();
    } catch (error: unknown) {
      const detail =
        (error as { response?: { data?: { role?: string[]; detail?: string } } })?.response
          ?.data;
      toast.error(
        String(detail?.role?.[0] || detail?.detail || "Could not create staff"),
      );
    } finally {
      setCreating(false);
    }
  };

  const confirmDelete = async () => {
    const person = pendingDelete;
    if (!person) return;
    if ((person.role || "").toLowerCase() === "manager") {
      toast.error("Manager accounts cannot be deleted here");
      setPendingDelete(null);
      return;
    }
    setDeletingId(person.id);
    try {
      await api.delete(`/user/${person.id}/`);
      toast.success("Staff account deleted");
      setPendingDelete(null);
      await load();
    } catch (error: unknown) {
      toast.error(
        String(
          (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
            "Could not delete account",
        ),
      );
    } finally {
      setDeletingId(null);
    }
  };

  const focusRole = (roleValue: string) => {
    if (!availableRoles.some((r) => r.value === roleValue)) return;
    staffForm.setValue("role", roleValue);
    document.getElementById("staff-create-form")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  return (
    <ClinicShell
      title="Staff & credentials"
      subtitle="One active login per clinical role. Staff only see their own portal."
    >
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatTile label="Clinic users" value={staff.length} tone="navy" />
        <StatTile
          label="Roles filled"
          value={`${ALL_STAFF_ROLES.length - openSlots}/${ALL_STAFF_ROLES.length}`}
          tone="green"
        />
        <StatTile label="Open slots" value={openSlots} tone={openSlots ? "orange" : "green"} />
      </div>

      <SectionCard
        kicker="Coverage"
        title="Role roster"
        description="Each clinical desk needs exactly one credential. Vacant slots can be filled from the form below."
        action={
          openSlots > 0 ? (
            <StatusPill tone="orange">{openSlots} open</StatusPill>
          ) : (
            <StatusPill tone="green">Fully staffed</StatusPill>
          )
        }
        className="mb-6"
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {ALL_STAFF_ROLES.map((role) => {
            const person = staffByRole.get(role.value);
            const Icon = role.icon;
            const filled = Boolean(person);
            return (
              <button
                key={role.value}
                type="button"
                disabled={filled}
                onClick={() => focusRole(role.value)}
                className={cn(
                  "group relative overflow-hidden rounded-3xl border px-4 py-4 text-left transition-all duration-200",
                  filled
                    ? "cursor-default border-primary/10 bg-linear-to-br from-white to-primary/4 shadow-sm"
                    : "cursor-pointer border-dashed border-cta/35 bg-linear-to-br from-amber-50/80 to-white hover:-translate-y-0.5 hover:border-cta/60 hover:shadow-lg hover:shadow-amber-100/60",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={cn(
                      "inline-flex size-10 items-center justify-center rounded-2xl ring-1",
                      filled
                        ? "bg-primary/10 text-primary ring-primary/15"
                        : "bg-cta/12 text-amber-800 ring-cta/25",
                    )}
                  >
                    <Icon className="size-4.5" />
                  </span>
                  {filled ? (
                    <CheckCircle2 className="size-4 text-emerald-600" />
                  ) : (
                    <UserPlus className="size-4 text-cta/80 opacity-0 transition group-hover:opacity-100" />
                  )}
                </div>
                <p className="mt-3 font-heading text-sm font-semibold text-primary">{role.label}</p>
                {filled ? (
                  <p className="mt-1 truncate text-xs font-medium text-muted-foreground">
                    {person?.username}
                  </p>
                ) : (
                  <p className="mt-1 text-xs font-medium text-amber-800/80">Open slot</p>
                )}
              </button>
            );
          })}
        </div>
      </SectionCard>

      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <SectionCard
          kicker="Credentials"
          title="Grant staff access"
          description="Issue login details for the next open clinical role — one account per desk."
        >
          <div id="staff-create-form">
            {availableRoles.length === 0 ? (
              <EmptyState
                title="All roles assigned"
                hint="Remove a staff credential to free a slot, then create a replacement."
              />
            ) : (
              <form className="grid gap-5" onSubmit={staffForm.handleSubmit(createStaff)}>
                <div className="flex items-start gap-3 rounded-2xl border border-primary/10 bg-linear-to-r from-primary/5 via-transparent to-cta/5 px-4 py-4">
                  <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
                    <KeyRound className="size-5" />
                  </span>
                  <div>
                    <p className="font-heading text-sm font-semibold text-primary">
                      New staff credential
                    </p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      Staff sign in at the clinic login page and can change their password under
                      Account.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <CustomFormField
                    control={staffForm.control}
                    name="username"
                    fieldType={formFieldTypes.INPUT}
                    label="Username"
                    placeholder="e.g. frontdesk"
                    description="Unique login ID for this clinic."
                  />

                  <CustomFormField
                    control={staffForm.control}
                    name="role"
                    fieldType={formFieldTypes.SELECT}
                    label="Role"
                    description="One portal per role."
                    options={availableRoles.map((role) => ({
                      label: role.label,
                      value: role.value,
                    }))}
                  />
                </div>

                <div className="rounded-2xl border border-primary/10 bg-slate-50/60 p-4">
                  <p className="mb-4 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Set password
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <CustomFormField
                      control={staffForm.control}
                      name="password"
                      fieldType={formFieldTypes.INPUT}
                      type="password"
                      label="Password"
                      placeholder="At least 6 characters"
                    />
                    <CustomFormField
                      control={staffForm.control}
                      name="confirm_password"
                      fieldType={formFieldTypes.INPUT}
                      type="password"
                      label="Confirm password"
                      placeholder="Re-enter password"
                    />
                  </div>
                </div>

                <SubmitButton
                  size="lg"
                  className={cn("w-full sm:w-auto", ctaButtonClass)}
                  loading={creating}
                  loadingLabel="Creating…"
                >
                  <KeyRound className="size-4" />
                  Create staff credential
                </SubmitButton>
              </form>
            )}
          </div>
        </SectionCard>

        <SectionCard
          kicker="Directory"
          title="Clinic users"
          description="Managers can revoke staff access. Each user updates their own password under Account."
          action={<StatusPill tone="navy">{clinicalStaff.length} clinical</StatusPill>}
        >
          {staff.length === 0 ? (
            <EmptyState
              title="No clinic users yet"
              hint="Create the first staff credential above to open a clinical portal."
            />
          ) : (
            <div className={catalogScrollClass}>
              <div className="space-y-3 pr-1">
                {managers.map((person) => {
                  const role = (person.role || "").toLowerCase();
                  const meta = roleMeta(role);
                  const Icon = meta.icon;
                  return (
                    <QueueItem
                      key={person.id}
                      className="border-primary/15 bg-linear-to-r from-primary/3 to-white"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar size="lg" className="ring-2 ring-primary/10">
                            <AvatarFallback className="bg-primary text-sm font-semibold text-primary-foreground">
                              {initials(person.username)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate font-heading text-base font-semibold text-primary">
                                {person.username}
                              </p>
                              <StatusPill tone="navy">Protected</StatusPill>
                            </div>
                            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Icon className="size-3.5 shrink-0" />
                              <span className="capitalize">{role}</span>
                              <span aria-hidden>·</span>
                              <span>Cannot be removed here</span>
                            </div>
                          </div>
                        </div>
                        <StatusPill tone={roleTone(role)}>{person.role}</StatusPill>
                      </div>
                    </QueueItem>
                  );
                })}

                {clinicalStaff.map((person) => {
                  const role = (person.role || "").toLowerCase();
                  const meta = roleMeta(role);
                  const Icon = meta.icon;
                  return (
                    <QueueItem key={person.id}>
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar size="lg" className="ring-2 ring-primary/10">
                            <AvatarFallback className="bg-linear-to-br from-primary/15 to-cta/10 text-sm font-semibold text-primary">
                              {initials(person.username)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate font-heading text-base font-semibold text-primary">
                              {person.username}
                            </p>
                            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Icon className="size-3.5 shrink-0 text-primary/70" />
                              <span className="capitalize">{meta.label} portal</span>
                              <span aria-hidden>·</span>
                              <span className="inline-flex items-center gap-1 text-emerald-700">
                                <span className="size-1.5 rounded-full bg-emerald-500" />
                                Active
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusPill tone={roleTone(role)}>{person.role}</StatusPill>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                size="icon-sm"
                                variant="outline"
                                className="rounded-xl border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                                onClick={() => setPendingDelete(person)}
                              >
                                <Trash2 className="size-4" />
                                <span className="sr-only">Delete {person.username}</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Revoke access</TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    </QueueItem>
                  );
                })}
              </div>
            </div>
          )}

          {staff.length > 0 ? (
            <div className="mt-4 flex items-center gap-2 rounded-2xl border border-primary/10 bg-slate-50/80 px-4 py-3 text-xs text-muted-foreground">
              <Users className="size-4 shrink-0 text-primary/70" />
              Staff sign in at the clinic login page and land in their role portal only.
            </div>
          ) : null}
        </SectionCard>
      </div>

      <AlertDialog
        open={pendingDelete != null}
        onOpenChange={(open) => {
          if (!open && deletingId == null) setPendingDelete(null);
        }}
      >
        <AlertDialogContent size="default" className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-rose-50 text-rose-700">
              <Trash2 />
            </AlertDialogMedia>
            <AlertDialogTitle>Revoke staff access?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes{" "}
              <span className="font-medium text-foreground">{pendingDelete?.username}</span>{" "}
              from the <span className="capitalize">{pendingDelete?.role}</span> role. That slot
              opens immediately for a new credential. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingId != null}>Keep account</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deletingId != null}
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
            >
              {deletingId != null ? "Revoking…" : "Revoke access"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ClinicShell>
  );
}
