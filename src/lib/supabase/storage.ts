import { createClient } from "@/lib/supabase/client";

function publicUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  return `${base}/storage/v1/object/public/product-images/${path}`;
}

export async function uploadProductImage(
  productSlug: string,
  file: File
): Promise<{ url: string; error?: string }> {
  const supabase = createClient();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `${productSlug}/${Date.now()}-${safeName}`;

  const { error } = await supabase.storage
    .from("product-images")
    .upload(path, file, { cacheControl: "3600", upsert: false });

  if (error) return { url: "", error: error.message };
  return { url: publicUrl(path) };
}

export async function uploadSiteImage(
  file: File
): Promise<{ url: string; error?: string }> {
  const supabase = createClient();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `site/${Date.now()}-${safeName}`;

  const { error } = await supabase.storage
    .from("product-images")
    .upload(path, file, { cacheControl: "3600", upsert: false });

  if (error) return { url: "", error: error.message };
  return { url: publicUrl(path) };
}
