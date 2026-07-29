"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CategoryRow } from "@/lib/types/database";
import { isValidSlug, slugify } from "@/lib/utils/slug";
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
  slug: string;
  label: string;
  eyebrow: string;
  title: string;
  description: string;
  announcement: string;
  sort_order: number;
  is_active: boolean;
  show_in_nav: boolean;
};

const empty: FormState = {
  slug: "",
  label: "",
  eyebrow: "",
  title: "",
  description: "",
  announcement: "",
  sort_order: 0,
  is_active: true,
  show_in_nav: true,
};

export function CategoryForm({ categoryId }: { categoryId?: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(empty);
  const [slugTouched, setSlugTouched] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(!!categoryId);

  useEffect(() => {
    if (!categoryId) return;
    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("id", categoryId)
        .single();
      setLoading(false);
      if (error || !data) {
        toast(error?.message ?? "Category not found", "error");
        return;
      }
      const row = data as CategoryRow;
      setForm({
        slug: row.slug,
        label: row.label,
        eyebrow: row.eyebrow ?? "",
        title: row.title ?? "",
        description: row.description ?? "",
        announcement: row.announcement ?? "",
        sort_order: row.sort_order,
        is_active: row.is_active,
        show_in_nav: row.show_in_nav,
      });
      setSlugTouched(true);
    })();
  }, [categoryId, toast]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "label" && !slugTouched) {
        next.slug = slugify(String(value));
      }
      return next;
    });
  }

  function validate() {
    const next: Record<string, string> = {};
    if (!form.label.trim()) next.label = "Label is required";
    if (!form.slug.trim()) next.slug = "Slug is required";
    else if (!isValidSlug(form.slug))
      next.slug = "Use lowercase kebab-case (e.g. desk-lights)";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setBusy(true);
    const supabase = createClient();
    const payload = {
      slug: form.slug.trim(),
      label: form.label.trim(),
      eyebrow: form.eyebrow.trim() || null,
      title: form.title.trim() || null,
      description: form.description.trim() || null,
      announcement: form.announcement.trim() || null,
      sort_order: Number(form.sort_order) || 0,
      is_active: form.is_active,
      show_in_nav: form.show_in_nav,
      updated_at: new Date().toISOString(),
    };

    const result = categoryId
      ? await supabase.from("categories").update(payload).eq("id", categoryId)
      : await supabase.from("categories").insert(payload);

    setBusy(false);
    if (result.error) {
      toast(result.error.message, "error");
      return;
    }
    toast(categoryId ? "Category saved" : "Category created");
    router.push("/admin/categories");
    router.refresh();
  }

  if (loading) {
    return <p className="text-sm text-muted">Loading…</p>;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <PageHeader
        title={categoryId ? "Edit category" : "New category"}
        actions={
          <>
            <Link href="/admin/categories" className={btnSecondary}>
              Cancel
            </Link>
            <button type="submit" disabled={busy} className={btnPrimary}>
              {busy ? "Saving…" : "Save"}
            </button>
          </>
        }
      />

      <Card className="grid gap-4 md:grid-cols-2">
        <Field label="Label" error={errors.label}>
          <input
            className={inputClass}
            value={form.label}
            onChange={(e) => set("label", e.target.value)}
          />
        </Field>
        <Field
          label="Slug"
          error={errors.slug}
          hint="lowercase-kebab-case"
        >
          <input
            className={inputClass}
            value={form.slug}
            onChange={(e) => {
              setSlugTouched(true);
              set("slug", e.target.value);
            }}
          />
        </Field>
        <Field label="Eyebrow">
          <input
            className={inputClass}
            value={form.eyebrow}
            onChange={(e) => set("eyebrow", e.target.value)}
          />
        </Field>
        <Field label="Title">
          <input
            className={inputClass}
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
          />
        </Field>
        <Field label="Description">
          <textarea
            className={inputClass}
            rows={3}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </Field>
        <Field label="Announcement">
          <textarea
            className={inputClass}
            rows={3}
            value={form.announcement}
            onChange={(e) => set("announcement", e.target.value)}
          />
        </Field>
        <Field label="Sort order">
          <input
            type="number"
            className={inputClass}
            value={form.sort_order}
            onChange={(e) => set("sort_order", Number(e.target.value))}
          />
        </Field>
        <div className="flex flex-col gap-3 pt-6">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => set("is_active", e.target.checked)}
            />
            Active
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.show_in_nav}
              onChange={(e) => set("show_in_nav", e.target.checked)}
            />
            Show in nav
          </label>
        </div>
      </Card>
    </form>
  );
}
