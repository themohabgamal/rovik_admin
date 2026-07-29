import { createClient } from "@/lib/supabase/client";

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

  const {
    data: { publicUrl },
  } = supabase.storage.from("product-images").getPublicUrl(path);

  return { url: publicUrl };
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

  const {
    data: { publicUrl },
  } = supabase.storage.from("product-images").getPublicUrl(path);

  return { url: publicUrl };
}
