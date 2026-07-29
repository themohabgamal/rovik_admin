import type { CategoryRow, ProductRow } from "@/lib/types/database";
import type { StorefrontProduct } from "@/lib/types/product";

export function mapProductToStorefront(
  product: ProductRow,
  category?: CategoryRow | null
): StorefrontProduct {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    price: Number(product.price),
    rating: Number(product.rating ?? 0),
    ratingDisplay: product.rating_display ?? String(product.rating ?? 0),
    reviews: product.reviews ?? 0,
    category: category?.label ?? "",
    categorySlug: category?.slug ?? "",
    image: product.image_url ?? "",
    hoverImage: product.hover_image_url ?? undefined,
    gallery: product.gallery ?? [],
    colors: product.colors ?? (product.color_options ?? []).map((c) => c.hex),
    colorOptions: product.color_options ?? [],
    features: product.features ?? [],
    bullets: product.bullets ?? [],
    story: {
      title: product.story_title ?? "",
      body: product.story_body ?? "",
      image: product.story_image_url ?? "",
    },
    specs: product.specs ?? [],
    inTheBox: product.in_the_box ?? [],
    badge: product.badge ?? undefined,
    featured: product.featured,
  };
}
