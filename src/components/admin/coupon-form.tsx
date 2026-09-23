"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CouponRow } from "@/lib/types/database";
import { useToast } from "@/components/admin/toast";
import {
  PageHeader,
  Field,
  Card,
  inputClass,
  btnPrimary,
  btnSecondary,
} from "@/components/admin/ui";

type FormState = {
  code: string;
  percent_off: string;
  is_active: boolean;
  requires_delivered_order: boolean;
  max_redemptions_per_phone: string;
  expires_at: string;
  description: string;
};

const empty: FormState = {
  code: "",
  percent_off: "10",
  is_active: true,
  requires_delivered_order: true,
  max_redemptions_per_phone: "1",
  expires_at: "",
  description: "",
};

export function CouponForm({ couponCode }: { couponCode?: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(!!couponCode);
  const editing = Boolean(couponCode);

  useEffect(() => {
    if (!couponCode) return;
    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", couponCode)
        .single();
      setLoading(false);
      if (error || !data) {
        toast(error?.message ?? "Coupon not found", "error");
        return;
      }
      const row = data as CouponRow;
      setForm({
        code: row.code,
        percent_off: String(row.percent_off),
        is_active: row.is_active,
        requires_delivered_order: row.requires_delivered_order,
        max_redemptions_per_phone: String(row.max_redemptions_per_phone ?? 1),
        expires_at: row.expires_at ? row.expires_at.slice(0, 16) : "",
        description: row.description ?? "",
      });
    })();
  }, [couponCode, toast]);

  function patch(next: Partial<FormState>) {
    setForm((prev) => ({ ...prev, ...next }));
  }

  function validate() {
    const next: Record<string, string> = {};
    if (!form.code.trim()) next.code = "Code is required";
    const value = Number(form.percent_off);
    if (!form.percent_off.trim() || Number.isNaN(value) || value < 0 || value > 100) {
      next.percent_off = "Enter a percent between 0 and 100";
    }
    const max = Number(form.max_redemptions_per_phone);
    if (!form.max_redemptions_per_phone.trim() || Number.isNaN(max) || max < 1) {
      next.max_redemptions_per_phone = "Must be at least 1";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setBusy(true);
    const supabase = createClient();
    const payload = {
      code: form.code.trim().toUpperCase(),
      percent_off: Number(form.percent_off),
      is_active: form.is_active,
      requires_delivered_order: form.requires_delivered_order,
      max_redemptions_per_phone: Number(form.max_redemptions_per_phone) || 1,
      expires_at: form.expires_at
        ? new Date(form.expires_at).toISOString()
        : null,
      description: form.description.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const result = editing
      ? await supabase.from("coupons").update(payload).eq("code", couponCode!)
      : await supabase.from("coupons").insert(payload);

    setBusy(false);
    if (result.error) {
      toast(result.error.message, "error");
      return;
    }
    toast(editing ? "Coupon updated" : "Coupon created");
    router.push("/admin/coupons");
    router.refresh();
  }

  if (loading) {
    return <p className="text-sm text-muted">Loading…</p>;
  }

  return (
    <div>
      <PageHeader
        title={editing ? `Edit ${form.code || "coupon"}` : "New coupon"}
        description="Discount is always calculated by validate_coupon on the database — never trust the browser."
        actions={
          <Link href="/admin/coupons" className={btnSecondary}>
            Back
          </Link>
        }
      />

      <form onSubmit={onSubmit} className="max-w-2xl space-y-4">
        <Card className="space-y-3">
          <Field label="Code" error={errors.code}>
            <input
              className={inputClass}
              value={form.code}
              disabled={editing}
              onChange={(e) => patch({ code: e.target.value.toUpperCase() })}
              placeholder="ROVIK10"
            />
          </Field>
          <Field label="Discount percent" error={errors.percent_off}>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              className={inputClass}
              value={form.percent_off}
              onChange={(e) => patch({ percent_off: e.target.value })}
            />
          </Field>
          <Field
            label="Max redemptions per phone"
            error={errors.max_redemptions_per_phone}
            hint="Use 1 for one-time coupons like ROVIK10"
          >
            <input
              type="number"
              min="1"
              step="1"
              className={inputClass}
              value={form.max_redemptions_per_phone}
              onChange={(e) =>
                patch({ max_redemptions_per_phone: e.target.value })
              }
            />
          </Field>
          <Field label="Expires at (optional)">
            <input
              type="datetime-local"
              className={inputClass}
              value={form.expires_at}
              onChange={(e) => patch({ expires_at: e.target.value })}
            />
          </Field>
          <Field label="Description">
            <textarea
              className={inputClass}
              rows={3}
              value={form.description}
              onChange={(e) => patch({ description: e.target.value })}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => patch({ is_active: e.target.checked })}
            />
            Active
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.requires_delivered_order}
              onChange={(e) =>
                patch({ requires_delivered_order: e.target.checked })
              }
            />
            Requires a prior delivered order on the same phone
          </label>
        </Card>

        <button type="submit" disabled={busy} className={btnPrimary}>
          {busy ? "Saving…" : editing ? "Save changes" : "Create coupon"}
        </button>
      </form>
    </div>
  );
}
