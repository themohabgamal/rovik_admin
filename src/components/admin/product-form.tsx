"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { uploadProductImage } from "@/lib/supabase/storage";
import type {
  CategoryRow,
  ColorOption,
  BulletItem,
  SpecItem,
  BoxItem,
  ProductRow,
} from "@/lib/types/database";
import { CONTENT_ICONS } from "@/lib/utils/icons";
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
import { ProductCostPanel } from "@/components/admin/product-cost-panel";
import type { ExpenseCurrency } from "@/lib/product-cost";

type FormState = {
  name: string;
  slug: string;
  category_id: string;
  price: string;
  cost: string;
  cost_currency: ExpenseCurrency;
  badge: string;
  featured: boolean;
  is_active: boolean;
  sort_order: number;
  rating: string;
  rating_display: string;
  reviews: string;
  image_url: string;
  hover_image_url: string;
  gallery: string[];
  color_options: ColorOption[];
  features: string[];
  bullets: BulletItem[];
  story_title: string;
  story_body: string;
  story_image_url: string;
  specs: SpecItem[];
  in_the_box: BoxItem[];
  seo_title: string;
  seo_description: string;
};

const empty: FormState = {
  name: "",
  slug: "",
  category_id: "",
  price: "",
  cost: "",
  cost_currency: "EGP",
  badge: "",
  featured: false,
  is_active: true,
  sort_order: 0,
  rating: "5",
  rating_display: "5.0",
  reviews: "0",
  image_url: "",
  hover_image_url: "",
  gallery: [],
  color_options: [],
  features: [],
  bullets: [],
  story_title: "",
  story_body: "",
  story_image_url: "",
  specs: [],
  in_the_box: [],
  seo_title: "",
  seo_description: "",
};

function rowToForm(row: ProductRow): FormState {
  return {
    name: row.name,
    slug: row.slug,
    category_id: row.category_id ?? "",
    price: String(row.price ?? ""),
    cost: row.cost == null ? "" : String(row.cost),
    cost_currency: row.cost_currency === "EGP" ? "EGP" : "USD",
    badge: row.badge ?? "",
    featured: row.featured,
    is_active: row.is_active,
    sort_order: row.sort_order,
    rating: String(row.rating ?? ""),
    rating_display: row.rating_display ?? "",
    reviews: String(row.reviews ?? 0),
    image_url: row.image_url ?? "",
    hover_image_url: row.hover_image_url ?? "",
    gallery: row.gallery ?? [],
    color_options: row.color_options ?? [],
    features: row.features ?? [],
    bullets: row.bullets ?? [],
    story_title: row.story_title ?? "",
    story_body: row.story_body ?? "",
    story_image_url: row.story_image_url ?? "",
    specs: row.specs ?? [],
    in_the_box: row.in_the_box ?? [],
    seo_title: row.seo_title ?? "",
    seo_description: row.seo_description ?? "",
  };
}

function ImagePreview({ url }: { url: string }) {
  if (!url) return null;
  return (
    <div className="relative mt-2 h-28 w-28 overflow-hidden rounded-lg border border-border bg-background">
      <Image src={url} alt="" fill className="object-cover" unoptimized />
    </div>
  );
}

export function ProductForm({ productId }: { productId?: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(empty);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [slugTouched, setSlugTouched] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [featureInput, setFeatureInput] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const mainFileRef = useRef<HTMLInputElement>(null);
  const hoverFileRef = useRef<HTMLInputElement>(null);
  const storyFileRef = useRef<HTMLInputElement>(null);
  const galleryFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const cats = await supabase
        .from("categories")
        .select("*")
        .order("sort_order");
      setCategories(cats.data ?? []);

      if (productId) {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("id", productId)
          .single();
        if (error || !data) {
          toast(error?.message ?? "Product not found", "error");
          setLoading(false);
          return;
        }
        setForm(rowToForm(data as ProductRow));
        setSlugTouched(true);
      }
      setLoading(false);
    })();
  }, [productId, toast]);

  function patch(partial: Partial<FormState>) {
    setForm((prev) => ({ ...prev, ...partial }));
  }

  async function handleUpload(
    file: File | undefined,
    onUrl: (url: string) => void
  ) {
    if (!file) return;
    const slug = form.slug || slugify(form.name) || "product";
    if (!isValidSlug(slug) && !slugify(form.name)) {
      toast("Set a valid slug before uploading images", "error");
      return;
    }
    const { url, error } = await uploadProductImage(slug, file);
    if (error || !url) {
      toast(error ?? "Upload failed", "error");
      return;
    }
    onUrl(url);
    toast("Image uploaded");
  }

  function validate() {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Name is required";
    if (!form.slug.trim()) next.slug = "Slug is required";
    else if (!isValidSlug(form.slug))
      next.slug = "Use lowercase kebab-case";
    if (!form.price.trim() || Number.isNaN(Number(form.price)))
      next.price = "Enter a valid price in EGP";
    if (form.cost.trim() && (Number.isNaN(Number(form.cost)) || Number(form.cost) < 0))
      next.cost = "Enter a valid base cost";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setBusy(true);

    const colors = form.color_options.map((c) => c.hex);
    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      category_id: form.category_id || null,
      price: Number(form.price),
      cost: form.cost.trim() === "" ? null : Number(form.cost),
      cost_currency: form.cost_currency,
      currency: "EGP",
      badge: form.badge.trim() || null,
      featured: form.featured,
      is_active: form.is_active,
      sort_order: Number(form.sort_order) || 0,
      rating: form.rating ? Number(form.rating) : null,
      rating_display: form.rating_display.trim() || null,
      reviews: form.reviews ? Number(form.reviews) : 0,
      image_url: form.image_url || null,
      hover_image_url: form.hover_image_url || null,
      gallery: form.gallery,
      colors,
      color_options: form.color_options,
      features: form.features,
      bullets: form.bullets,
      story_title: form.story_title.trim() || null,
      story_body: form.story_body.trim() || null,
      story_image_url: form.story_image_url || null,
      specs: form.specs,
      in_the_box: form.in_the_box,
      seo_title: form.seo_title.trim() || null,
      seo_description: form.seo_description.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const supabase = createClient();
    if (productId) {
      const result = await supabase
        .from("products")
        .update(payload)
        .eq("id", productId);
      setBusy(false);
      if (result.error) {
        toast(result.error.message, "error");
        return;
      }
      toast("Product saved");
      router.refresh();
      return;
    }

    const result = await supabase
      .from("products")
      .insert(payload)
      .select("id")
      .single();
    setBusy(false);
    if (result.error) {
      toast(result.error.message, "error");
      return;
    }
    toast("Product created — add expenses below");
    router.push(`/admin/products/${result.data.id}`);
    router.refresh();
  }

  function onGalleryDragStart(index: number) {
    setDragIndex(index);
  }

  function onGalleryDrop(index: number) {
    if (dragIndex === null || dragIndex === index) return;
    const next = [...form.gallery];
    const [item] = next.splice(dragIndex, 1);
    next.splice(index, 0, item);
    patch({ gallery: next });
    setDragIndex(null);
  }

  if (loading) return <p className="text-sm text-muted">Loading…</p>;

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <PageHeader
        title={productId ? "Edit product" : "New product"}
        actions={
          <>
            <Link href="/admin/products" className={btnSecondary}>
              Cancel
            </Link>
            <button type="submit" disabled={busy} className={btnPrimary}>
              {busy ? "Saving…" : "Save product"}
            </button>
          </>
        }
      />

      <Card>
        <h3 className="mb-4 text-sm font-semibold">Basics</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Name" error={errors.name}>
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => {
                const name = e.target.value;
                patch({
                  name,
                  ...(!slugTouched ? { slug: slugify(name) } : {}),
                });
              }}
            />
          </Field>
          <Field label="Slug" error={errors.slug}>
            <input
              className={inputClass}
              value={form.slug}
              onChange={(e) => {
                setSlugTouched(true);
                patch({ slug: e.target.value });
              }}
            />
          </Field>
          <Field label="Category">
            <select
              className={inputClass}
              value={form.category_id}
              onChange={(e) => patch({ category_id: e.target.value })}
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Price (EGP)" error={errors.price}>
            <input
              type="number"
              step="0.01"
              className={inputClass}
              value={form.price}
              onChange={(e) => patch({ price: e.target.value })}
            />
          </Field>
          <Field label="Badge">
            <input
              className={inputClass}
              value={form.badge}
              onChange={(e) => patch({ badge: e.target.value })}
              placeholder="e.g. Best seller"
            />
          </Field>
          <Field label="Sort order">
            <input
              type="number"
              className={inputClass}
              value={form.sort_order}
              onChange={(e) => patch({ sort_order: Number(e.target.value) })}
            />
          </Field>
          <Field label="Rating">
            <input
              type="number"
              step="0.1"
              className={inputClass}
              value={form.rating}
              onChange={(e) => patch({ rating: e.target.value })}
            />
          </Field>
          <Field label="Rating display">
            <input
              className={inputClass}
              value={form.rating_display}
              onChange={(e) => patch({ rating_display: e.target.value })}
            />
          </Field>
          <Field label="Reviews count">
            <input
              type="number"
              className={inputClass}
              value={form.reviews}
              onChange={(e) => patch({ reviews: e.target.value })}
            />
          </Field>
          <div className="flex flex-col gap-3 pt-6">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => patch({ featured: e.target.checked })}
              />
              Featured
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => patch({ is_active: e.target.checked })}
              />
              Active
            </label>
          </div>
        </div>
      </Card>

      {productId ? (
        <ProductCostPanel
          productId={productId}
          sellingPrice={Number(form.price) || 0}
          baseCost={form.cost.trim() === "" ? null : Number(form.cost)}
          costCurrency={form.cost_currency}
          onBaseCostChange={(cost, currency) =>
            patch({
              cost: cost == null || Number.isNaN(cost) ? "" : String(cost),
              cost_currency: currency,
            })
          }
        />
      ) : (
        <Card>
          <h3 className="mb-3 text-sm font-semibold">Base product cost</h3>
          <p className="mb-4 text-xs text-muted">
            Save the product first to add customs, shipping, and other allocated
            expenses.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Base cost" error={errors.cost}>
              <input
                type="number"
                step="0.01"
                min="0"
                className={inputClass}
                value={form.cost}
                onChange={(e) => patch({ cost: e.target.value })}
              />
            </Field>
            <Field label="Base cost currency">
              <select
                className={inputClass}
                value={form.cost_currency}
                onChange={(e) =>
                  patch({
                    cost_currency: e.target.value as ExpenseCurrency,
                  })
                }
              >
                <option value="USD">USD</option>
                <option value="EGP">EGP</option>
              </select>
            </Field>
          </div>
        </Card>
      )}

      <Card>
        <h3 className="mb-4 text-sm font-semibold">Images</h3>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <Field label="Main image">
              <input
                ref={mainFileRef}
                type="file"
                accept="image/*"
                className="block w-full text-sm"
                onChange={(e) =>
                  void handleUpload(e.target.files?.[0], (url) =>
                    patch({ image_url: url })
                  )
                }
              />
            </Field>
            <Field label="Or paste URL">
              <input
                className={inputClass}
                value={form.image_url}
                onChange={(e) => patch({ image_url: e.target.value })}
              />
            </Field>
            <ImagePreview url={form.image_url} />
          </div>
          <div>
            <Field label="Hover image">
              <input
                ref={hoverFileRef}
                type="file"
                accept="image/*"
                className="block w-full text-sm"
                onChange={(e) =>
                  void handleUpload(e.target.files?.[0], (url) =>
                    patch({ hover_image_url: url })
                  )
                }
              />
            </Field>
            <Field label="Or paste URL">
              <input
                className={inputClass}
                value={form.hover_image_url}
                onChange={(e) => patch({ hover_image_url: e.target.value })}
              />
            </Field>
            <ImagePreview url={form.hover_image_url} />
          </div>
          <div>
            <Field label="Story image">
              <input
                ref={storyFileRef}
                type="file"
                accept="image/*"
                className="block w-full text-sm"
                onChange={(e) =>
                  void handleUpload(e.target.files?.[0], (url) =>
                    patch({ story_image_url: url })
                  )
                }
              />
            </Field>
            <Field label="Or paste URL">
              <input
                className={inputClass}
                value={form.story_image_url}
                onChange={(e) => patch({ story_image_url: e.target.value })}
              />
            </Field>
            <ImagePreview url={form.story_image_url} />
          </div>
          <div>
            <Field label="Gallery (multi-upload, drag to reorder)">
              <input
                ref={galleryFileRef}
                type="file"
                accept="image/*"
                multiple
                className="block w-full text-sm"
                onChange={async (e) => {
                  const files = Array.from(e.target.files ?? []);
                  for (const file of files) {
                    await handleUpload(file, (url) =>
                      setForm((prev) => ({
                        ...prev,
                        gallery: [...prev.gallery, url],
                      }))
                    );
                  }
                  if (galleryFileRef.current) galleryFileRef.current.value = "";
                }}
              />
            </Field>
            <div className="mt-3 flex flex-wrap gap-2">
              {form.gallery.map((url, index) => (
                <div
                  key={`${url}-${index}`}
                  draggable
                  onDragStart={() => onGalleryDragStart(index)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => onGalleryDrop(index)}
                  className="group relative h-20 w-20 cursor-grab overflow-hidden rounded-lg border border-border"
                >
                  <Image
                    src={url}
                    alt=""
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <button
                    type="button"
                    onClick={() =>
                      patch({
                        gallery: form.gallery.filter((_, i) => i !== index),
                      })
                    }
                    className="absolute right-1 top-1 hidden rounded bg-black/70 px-1.5 text-[10px] text-white group-hover:block"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="mb-4 text-sm font-semibold">Options</h3>
        <div className="space-y-4">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium">Color options</span>
              <button
                type="button"
                className={btnSecondary + " !px-2 !py-1 text-xs"}
                onClick={() =>
                  patch({
                    color_options: [
                      ...form.color_options,
                      { name: "", hex: "#000000" },
                    ],
                  })
                }
              >
                Add color
              </button>
            </div>
            <div className="space-y-2">
              {form.color_options.map((opt, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <input
                    className={inputClass + " max-w-[160px]"}
                    placeholder="Name"
                    value={opt.name}
                    onChange={(e) => {
                      const next = [...form.color_options];
                      next[i] = { ...next[i], name: e.target.value };
                      patch({ color_options: next });
                    }}
                  />
                  <input
                    type="color"
                    value={opt.hex}
                    onChange={(e) => {
                      const next = [...form.color_options];
                      next[i] = { ...next[i], hex: e.target.value };
                      patch({ color_options: next });
                    }}
                  />
                  <input
                    className={inputClass + " max-w-[120px]"}
                    value={opt.hex}
                    onChange={(e) => {
                      const next = [...form.color_options];
                      next[i] = { ...next[i], hex: e.target.value };
                      patch({ color_options: next });
                    }}
                  />
                  <span
                    className="h-8 w-8 rounded-full border border-border"
                    style={{ background: opt.hex }}
                  />
                  <button
                    type="button"
                    className="text-xs text-danger"
                    onClick={() =>
                      patch({
                        color_options: form.color_options.filter(
                          (_, idx) => idx !== i
                        ),
                      })
                    }
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted">
              `colors` is derived from these hex values on save.
            </p>
          </div>

          <div>
            <Field label="Features">
              <div className="flex gap-2">
                <input
                  className={inputClass}
                  value={featureInput}
                  onChange={(e) => setFeatureInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const v = featureInput.trim();
                      if (!v) return;
                      patch({ features: [...form.features, v] });
                      setFeatureInput("");
                    }
                  }}
                  placeholder="Type and press Enter"
                />
                <button
                  type="button"
                  className={btnSecondary}
                  onClick={() => {
                    const v = featureInput.trim();
                    if (!v) return;
                    patch({ features: [...form.features, v] });
                    setFeatureInput("");
                  }}
                >
                  Add
                </button>
              </div>
            </Field>
            <div className="mt-2 flex flex-wrap gap-2">
              {form.features.map((f, i) => (
                <button
                  key={`${f}-${i}`}
                  type="button"
                  onClick={() =>
                    patch({
                      features: form.features.filter((_, idx) => idx !== i),
                    })
                  }
                  className="rounded-full border border-border bg-background px-3 py-1 text-xs"
                >
                  {f} ×
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="mb-4 text-sm font-semibold">Detail content</h3>
        <div className="space-y-6">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium">Bullets</span>
              <button
                type="button"
                className={btnSecondary + " !px-2 !py-1 text-xs"}
                onClick={() =>
                  patch({
                    bullets: [
                      ...form.bullets,
                      { icon: "plus", text: "" },
                    ],
                  })
                }
              >
                Add bullet
              </button>
            </div>
            <div className="space-y-2">
              {form.bullets.map((b, i) => (
                <div key={i} className="flex flex-wrap gap-2">
                  <select
                    className={inputClass + " max-w-[140px]"}
                    value={b.icon}
                    onChange={(e) => {
                      const next = [...form.bullets];
                      next[i] = { ...next[i], icon: e.target.value };
                      patch({ bullets: next });
                    }}
                  >
                    {CONTENT_ICONS.map((icon) => (
                      <option key={icon} value={icon}>
                        {icon}
                      </option>
                    ))}
                  </select>
                  <input
                    className={inputClass + " min-w-[200px] flex-1"}
                    value={b.text}
                    onChange={(e) => {
                      const next = [...form.bullets];
                      next[i] = { ...next[i], text: e.target.value };
                      patch({ bullets: next });
                    }}
                  />
                  <button
                    type="button"
                    className="text-xs text-danger"
                    onClick={() =>
                      patch({
                        bullets: form.bullets.filter((_, idx) => idx !== i),
                      })
                    }
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Story title">
              <input
                className={inputClass}
                value={form.story_title}
                onChange={(e) => patch({ story_title: e.target.value })}
              />
            </Field>
            <div className="md:col-span-2">
              <Field label="Story body">
                <textarea
                  className={inputClass}
                  rows={4}
                  value={form.story_body}
                  onChange={(e) => patch({ story_body: e.target.value })}
                />
              </Field>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium">Specs</span>
              <button
                type="button"
                className={btnSecondary + " !px-2 !py-1 text-xs"}
                onClick={() =>
                  patch({
                    specs: [...form.specs, { label: "", value: "" }],
                  })
                }
              >
                Add spec
              </button>
            </div>
            <div className="space-y-2">
              {form.specs.map((s, i) => (
                <div key={i} className="flex flex-wrap gap-2">
                  <input
                    className={inputClass + " max-w-[180px]"}
                    placeholder="Label"
                    value={s.label}
                    onChange={(e) => {
                      const next = [...form.specs];
                      next[i] = { ...next[i], label: e.target.value };
                      patch({ specs: next });
                    }}
                  />
                  <input
                    className={inputClass + " min-w-[180px] flex-1"}
                    placeholder="Value"
                    value={s.value}
                    onChange={(e) => {
                      const next = [...form.specs];
                      next[i] = { ...next[i], value: e.target.value };
                      patch({ specs: next });
                    }}
                  />
                  <button
                    type="button"
                    className="text-xs text-danger"
                    onClick={() =>
                      patch({
                        specs: form.specs.filter((_, idx) => idx !== i),
                      })
                    }
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium">In the box</span>
              <button
                type="button"
                className={btnSecondary + " !px-2 !py-1 text-xs"}
                onClick={() =>
                  patch({
                    in_the_box: [
                      ...form.in_the_box,
                      { icon: "box", text: "" },
                    ],
                  })
                }
              >
                Add item
              </button>
            </div>
            <div className="space-y-2">
              {form.in_the_box.map((item, i) => (
                <div key={i} className="flex flex-wrap gap-2">
                  <select
                    className={inputClass + " max-w-[140px]"}
                    value={item.icon}
                    onChange={(e) => {
                      const next = [...form.in_the_box];
                      next[i] = { ...next[i], icon: e.target.value };
                      patch({ in_the_box: next });
                    }}
                  >
                    {CONTENT_ICONS.map((icon) => (
                      <option key={icon} value={icon}>
                        {icon}
                      </option>
                    ))}
                  </select>
                  <input
                    className={inputClass + " min-w-[200px] flex-1"}
                    value={item.text}
                    onChange={(e) => {
                      const next = [...form.in_the_box];
                      next[i] = { ...next[i], text: e.target.value };
                      patch({ in_the_box: next });
                    }}
                  />
                  <button
                    type="button"
                    className="text-xs text-danger"
                    onClick={() =>
                      patch({
                        in_the_box: form.in_the_box.filter(
                          (_, idx) => idx !== i
                        ),
                      })
                    }
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="mb-4 text-sm font-semibold">SEO</h3>
        <div className="grid gap-4">
          <Field label="SEO title">
            <input
              className={inputClass}
              value={form.seo_title}
              onChange={(e) => patch({ seo_title: e.target.value })}
            />
          </Field>
          <Field label="SEO description">
            <textarea
              className={inputClass}
              rows={3}
              value={form.seo_description}
              onChange={(e) => patch({ seo_description: e.target.value })}
            />
          </Field>
        </div>
      </Card>
    </form>
  );
}
