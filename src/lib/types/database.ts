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
  cost: number | null;
  cost_currency?: "USD" | "EGP";
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
  usd_egp_rate: number | null;
  updated_at: string;
};

export type ProductExpenseRow = {
  id: string;
  product_id: string;
  name: string;
  amount: number;
  currency: "USD" | "EGP";
  quantity: number;
  note: string | null;
  occurred_at: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderRow = {
  id: string;
  order_number: string | null;
  status: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  governorate: string | null;
  notes: string | null;
  items: Json | null;
  total: number | null;
  tracking_token: string | null;
  shipped_at: string | null;
  created_at: string;
  updated_at: string | null;
  product_subtotal: number | null;
  shipping_fee_charged: number | null;
  shipping_company_cost: number | null;
  product_cost: number | null;
  packaging_cost: number | null;
  advertising_cost: number | null;
  other_expenses: number | null;
  other_expenses_note: string | null;
  amount_collected: number | null;
  amount_received: number | null;
  shipping_company: string | null;
  shipping_tracking_number: string | null;
  shipping_paid_at: string | null;
  shipping_payment_status: string | null;
  settlement_status: string | null;
  settlement_date: string | null;
  settlement_reference: string | null;
  settlement_notes: string | null;
  financial_status: string | null;
  return_reason: string | null;
  return_shipping_cost: number | null;
  product_recoverable_value: number | null;
  product_lost_cost: number | null;
  return_additional_expenses: number | null;
  customer_refund: number | null;
  delivered_at: string | null;
  returned_at: string | null;
  cancelled_at: string | null;
  coupon_code: string | null;
  coupon_discount: number | null;
  wa_notified_at?: string | null;
};

export type OrderTransactionRow = {
  id: string;
  order_id: string | null;
  type: string;
  direction: string;
  amount: number;
  note: string | null;
  occurred_at: string;
  created_at: string;
};

export type CouponRow = {
  code: string;
  percent_off: number;
  is_active: boolean;
  expires_at: string | null;
  requires_delivered_order: boolean;
  max_redemptions_per_phone: number;
  description: string | null;
  created_at: string;
  updated_at: string | null;
};

export type CouponRedemptionRow = {
  id: string;
  coupon_code: string;
  phone_normalized: string;
  order_number: number;
  discount_amount: number;
  redeemed_at: string;
};

export type ImportOrderRow = {
  id: string;
  name: string;
  supplier_name: string | null;
  order_date: string | null;
  status: "draft" | "completed";
  stock_type?: "import" | "local" | null;
  exchange_rate: number;
  international_shipping_usd: number;
  products: Json;
  expenses: Json;
  created_at: string;
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
          cost?: number | null;
          cost_currency?: "USD" | "EGP";
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
          cost?: number | null;
          cost_currency?: "USD" | "EGP";
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
      orders: {
        Row: OrderRow;
        Insert: Partial<OrderRow> & { id?: string };
        Update: Partial<OrderRow>;
        Relationships: EmptyRelationships;
      };
      order_transactions: {
        Row: OrderTransactionRow;
        Insert: Partial<OrderTransactionRow> & {
          type: string;
          direction: string;
          amount: number;
        };
        Update: Partial<OrderTransactionRow>;
        Relationships: EmptyRelationships;
      };
      import_orders: {
        Row: ImportOrderRow;
        Insert: {
          id?: string;
          name: string;
          supplier_name?: string | null;
          order_date?: string | null;
          status?: "draft" | "completed";
          stock_type?: "import" | "local";
          exchange_rate?: number;
          international_shipping_usd?: number;
          products?: Json;
          expenses?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          supplier_name?: string | null;
          order_date?: string | null;
          status?: "draft" | "completed";
          stock_type?: "import" | "local";
          exchange_rate?: number;
          international_shipping_usd?: number;
          products?: Json;
          expenses?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: EmptyRelationships;
      };
      coupons: {
        Row: CouponRow;
        Insert: {
          code: string;
          percent_off: number;
          is_active?: boolean;
          expires_at?: string | null;
          requires_delivered_order?: boolean;
          max_redemptions_per_phone?: number;
          description?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: Partial<CouponRow>;
        Relationships: EmptyRelationships;
      };
      coupon_redemptions: {
        Row: CouponRedemptionRow;
        Insert: {
          id?: string;
          coupon_code: string;
          phone_normalized: string;
          order_number: number;
          discount_amount: number;
          redeemed_at?: string;
        };
        Update: Partial<CouponRedemptionRow>;
        Relationships: EmptyRelationships;
      };
      site_settings: {
        Row: SiteSettingsRow;
        Insert: {
          id: string;
          hero_image_url?: string | null;
          default_announcement?: string | null;
          press_logos?: string[] | null;
          usd_egp_rate?: number | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          hero_image_url?: string | null;
          default_announcement?: string | null;
          press_logos?: string[] | null;
          usd_egp_rate?: number | null;
          updated_at?: string;
        };
        Relationships: EmptyRelationships;
      };
      product_expenses: {
        Row: ProductExpenseRow;
        Insert: {
          id?: string;
          product_id: string;
          name: string;
          amount: number;
          currency?: "USD" | "EGP";
          quantity?: number;
          note?: string | null;
          occurred_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<ProductExpenseRow>;
        Relationships: [
          {
            foreignKeyName: "product_expenses_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      normalize_egypt_phone: {
        Args: { raw: string };
        Returns: string;
      };
      validate_coupon: {
        Args: { p_code: string; p_phone: string; p_subtotal: number };
        Returns: Json;
      };
      redeem_coupon: {
        Args: {
          p_code: string;
          p_phone: string;
          p_order_number: number;
          p_discount_amount?: number;
        };
        Returns: Json;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
