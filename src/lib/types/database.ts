export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ColorOption = { name: string; hex: string };
export type BulletItem = { icon: string; text: string };
export type SpecItem = { label: string; value: string };
export type BoxItem = { icon: string; text: string };

export type CategoryRow = {
  id: string;
  slug: string;
  label: string;
  eyebrow: string | null;
  title: string | null;
  description: string | null;
  announcement: string | null;
  sort_order: number;
  is_active: boolean;
  show_in_nav: boolean;
  created_at: string;
  updated_at: string;
};

export type ProductRow = {
  id: string;
  slug: string;
  name: string;
  price: number;
  currency: string;
  category_id: string | null;
  rating: number | null;
  rating_display: string | null;
  reviews: number | null;
  badge: string | null;
  featured: boolean;
  is_active: boolean;
  sort_order: number;
  image_url: string | null;
  hover_image_url: string | null;
  gallery: string[] | null;
  colors: string[] | null;
  color_options: ColorOption[] | null;
  features: string[] | null;
  bullets: BulletItem[] | null;
  story_title: string | null;
  story_body: string | null;
  story_image_url: string | null;
  specs: SpecItem[] | null;
  in_the_box: BoxItem[] | null;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
};

export type WaitlistRow = {
  id: string;
  email: string;
  source: string | null;
  created_at: string;
};

export type SiteSettingsRow = {
  id: string;
  hero_image_url: string | null;
  default_announcement: string | null;
  press_logos: string[] | null;
  updated_at: string;
};

type EmptyRelationships = [];

export type Database = {
  public: {
    Tables: {
      categories: {
        Row: CategoryRow;
        Insert: {
          id?: string;
          slug: string;
          label: string;
          eyebrow?: string | null;
          title?: string | null;
          description?: string | null;
          announcement?: string | null;
          sort_order?: number;
          is_active?: boolean;
          show_in_nav?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          label?: string;
          eyebrow?: string | null;
          title?: string | null;
          description?: string | null;
          announcement?: string | null;
          sort_order?: number;
          is_active?: boolean;
          show_in_nav?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: EmptyRelationships;
      };
      products: {
        Row: ProductRow;
        Insert: {
          id?: string;
          slug: string;
          name: string;
          price: number;
          currency?: string;
          category_id?: string | null;
          rating?: number | null;
          rating_display?: string | null;
          reviews?: number | null;
          badge?: string | null;
          featured?: boolean;
          is_active?: boolean;
          sort_order?: number;
          image_url?: string | null;
          hover_image_url?: string | null;
          gallery?: string[] | null;
          colors?: string[] | null;
          color_options?: ColorOption[] | null;
          features?: string[] | null;
          bullets?: BulletItem[] | null;
          story_title?: string | null;
          story_body?: string | null;
          story_image_url?: string | null;
          specs?: SpecItem[] | null;
          in_the_box?: BoxItem[] | null;
          seo_title?: string | null;
          seo_description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          price?: number;
          currency?: string;
          category_id?: string | null;
          rating?: number | null;
          rating_display?: string | null;
          reviews?: number | null;
          badge?: string | null;
          featured?: boolean;
          is_active?: boolean;
          sort_order?: number;
          image_url?: string | null;
          hover_image_url?: string | null;
          gallery?: string[] | null;
          colors?: string[] | null;
          color_options?: ColorOption[] | null;
          features?: string[] | null;
          bullets?: BulletItem[] | null;
          story_title?: string | null;
          story_body?: string | null;
          story_image_url?: string | null;
          specs?: SpecItem[] | null;
          in_the_box?: BoxItem[] | null;
          seo_title?: string | null;
          seo_description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      waitlist: {
        Row: WaitlistRow;
        Insert: {
          id?: string;
          email: string;
          source?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          source?: string | null;
          created_at?: string;
        };
        Relationships: EmptyRelationships;
      };
      site_settings: {
        Row: SiteSettingsRow;
        Insert: {
          id: string;
          hero_image_url?: string | null;
          default_announcement?: string | null;
          press_logos?: string[] | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          hero_image_url?: string | null;
          default_announcement?: string | null;
          press_logos?: string[] | null;
          updated_at?: string;
        };
        Relationships: EmptyRelationships;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
