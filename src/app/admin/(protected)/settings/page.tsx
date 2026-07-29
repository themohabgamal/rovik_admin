"use client";

import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { uploadSiteImage } from "@/lib/supabase/storage";
import { useToast } from "@/components/admin/toast";
import {
  PageHeader,
  Field,
  Card,
  LoadingState,
  ErrorState,
  inputClass,
  btnPrimary,
  btnSecondary,
} from "@/components/admin/ui";

export default function SettingsPage() {
  const { toast } = useToast();
  const [heroImageUrl, setHeroImageUrl] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [pressLogos, setPressLogos] = useState<string[]>([]);
  const [logoInput, setLogoInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("site_settings")
      .select("*")
      .eq("id", "main")
      .maybeSingle();
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    if (data) {
      setHeroImageUrl(data.hero_image_url ?? "");
      setAnnouncement(data.default_announcement ?? "");
      setPressLogos(data.press_logos ?? []);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onUpload(file: File | undefined) {
    if (!file) return;
    const { url, error: uploadError } = await uploadSiteImage(file);
    if (uploadError || !url) {
      toast(uploadError ?? "Upload failed", "error");
      return;
    }
    setHeroImageUrl(url);
    toast("Hero image uploaded");
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const supabase = createClient();
    const { error: err } = await supabase.from("site_settings").upsert({
      id: "main",
      hero_image_url: heroImageUrl.trim() || null,
      default_announcement: announcement.trim() || null,
      press_logos: pressLogos,
      updated_at: new Date().toISOString(),
    });
    setBusy(false);
    if (err) {
      toast(err.message, "error");
      return;
    }
    toast("Settings saved");
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <PageHeader
        title="Settings"
        description="Site-wide content for the storefront."
        actions={
          <button type="submit" disabled={busy} className={btnPrimary}>
            {busy ? "Saving…" : "Save settings"}
          </button>
        }
      />

      <Card className="space-y-4">
        <Field label="Hero image">
          <input
            type="file"
            accept="image/*"
            className="mb-2 block w-full text-sm"
            onChange={(e) => void onUpload(e.target.files?.[0])}
          />
          <input
            className={inputClass}
            placeholder="Or paste image URL"
            value={heroImageUrl}
            onChange={(e) => setHeroImageUrl(e.target.value)}
          />
        </Field>
        {heroImageUrl && (
          <div className="relative h-40 w-full max-w-md overflow-hidden rounded-lg border border-border">
            <Image
              src={heroImageUrl}
              alt=""
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        )}

        <Field label="Default announcement">
          <textarea
            className={inputClass}
            rows={3}
            value={announcement}
            onChange={(e) => setAnnouncement(e.target.value)}
          />
        </Field>

        <div>
          <Field label="Press logos (URLs)">
            <div className="flex gap-2">
              <input
                className={inputClass}
                value={logoInput}
                onChange={(e) => setLogoInput(e.target.value)}
                placeholder="https://…"
              />
              <button
                type="button"
                className={btnSecondary}
                onClick={() => {
                  const v = logoInput.trim();
                  if (!v) return;
                  setPressLogos((prev) => [...prev, v]);
                  setLogoInput("");
                }}
              >
                Add
              </button>
            </div>
          </Field>
          <ul className="mt-3 space-y-2">
            {pressLogos.map((logo, i) => (
              <li
                key={`${logo}-${i}`}
                className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm"
              >
                <span className="truncate">{logo}</span>
                <button
                  type="button"
                  className="shrink-0 text-xs text-danger"
                  onClick={() =>
                    setPressLogos((prev) => prev.filter((_, idx) => idx !== i))
                  }
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      </Card>
    </form>
  );
}
