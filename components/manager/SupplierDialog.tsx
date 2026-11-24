"use client";

import { useState } from "react";
import { isValidPhoneNumber } from "react-phone-number-input";
import { toast } from "sonner";

import { Field } from "@/components/manager/MedicineFields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/phone-input";
import { LoadingButton } from "@/components/ui/submit-button";
import { api } from "@/lib/api";
import type { Supplier } from "@/lib/clinic";
import { apiErrorDetail } from "@/lib/parallelBatch";

/** Register a supplier (name, phone, optional email) so medicine lines can be linked to it. */
export function SupplierDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (supplier: Supplier) => void | Promise<void>;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const reset = () => {
    setName("");
    setPhone("");
    setEmail("");
    setErrors({});
  };

  const save = async () => {
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next.supplier_name = "Enter the supplier name.";
    if (!phone) next.supplier_phone = "Enter a phone number.";
    else if (!isValidPhoneNumber(phone)) next.supplier_phone = "Enter a valid phone number.";
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) next.supplier_email = "Enter a valid email.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      const { data } = await api.post<Supplier>("/clinic/suppliers/", {
        supplier_name: name.trim(),
        supplier_phone: phone,
        supplier_email: email.trim(),
      });
      toast.success(`${data.supplier_name} added`);
      reset();
      await onCreated(data);
      onClose();
    } catch (error) {
      const data = (error as { response?: { data?: Record<string, unknown> } })?.response?.data;
      const fieldErrors: Record<string, string> = {};
      for (const key of ["supplier_name", "supplier_phone", "supplier_email"]) {
        const value = data?.[key];
        if (value) fieldErrors[key] = Array.isArray(value) ? String(value[0]) : String(value);
      }
      if (Object.keys(fieldErrors).length) setErrors(fieldErrors);
      else toast.error(apiErrorDetail(error, "Could not add supplier"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New supplier</DialogTitle>
          <DialogDescription>Who you buy this stock from. You can pick them on any medicine line.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Supplier name" error={errors.supplier_name}>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Addis Pharma" className="h-10 rounded-xl" />
          </Field>
          <Field label="Phone" error={errors.supplier_phone}>
            <PhoneInput
              value={phone}
              onChange={(value) => setPhone(value ?? "")}
              defaultCountry="ET"
              international
              placeholder="Phone number"
              aria-invalid={Boolean(errors.supplier_phone)}
            />
          </Field>
          <Field label="Email (optional)" error={errors.supplier_email}>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="orders@supplier.com" inputMode="email" className="h-10 rounded-xl" />
          </Field>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <LoadingButton loading={saving} loadingLabel="Saving…" onClick={() => void save()}>
            Add supplier
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
