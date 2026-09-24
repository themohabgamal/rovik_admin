export type OrderStatus =
  | "pending"
  | "received"
  | "confirmed"
  | "preparing"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "delivery_failed"
  | "return_requested"
  | "returning"
  | "returned"
  | "cancelled";

export type OrderLine = {
  name: string;
  slug: string;
  quantity: number;
  price: number;
  image?: string;
};

export type SettlementStatus =
  | "pending"
  | "partially_received"
  | "received"
  | "disputed";

export type ShippingPaymentStatus = "unpaid" | "paid" | "waived";

export type FinancialStatus =
  | "expected"
  | "realized"
  | "loss"
  | "cancelled"
  | "incomplete";

export type OrderFinance = {
  productSubtotal: number | null;
  shippingFeeCharged: number | null;
  shippingCompanyCost: number | null;
  productCost: number | null;
  packagingCost: number;
  advertisingCost: number;
  otherExpenses: number;
  otherExpensesNote: string | null;
  amountCollected: number | null;
  amountReceived: number | null;
  shippingCompany: string | null;
  shippingTrackingNumber: string | null;
  shippingPaidAt: string | null;
  shippingPaymentStatus: ShippingPaymentStatus;
  settlementStatus: SettlementStatus;
  settlementDate: string | null;
  settlementReference: string | null;
  settlementNotes: string | null;
  financialStatus: FinancialStatus;
  returnReason: string | null;
  returnShippingCost: number;
  productRecoverableValue: number;
  productLostCost: number;
  returnAdditionalExpenses: number;
  customerRefund: number;
  deliveredAt: string | null;
  returnedAt: string | null;
  cancelledAt: string | null;
};

export function emptyFinance(): OrderFinance {
  return {
    productSubtotal: null,
    shippingFeeCharged: null,
    shippingCompanyCost: null,
    productCost: null,
    packagingCost: 0,
    advertisingCost: 0,
    otherExpenses: 0,
    otherExpensesNote: null,
    amountCollected: null,
    amountReceived: null,
    shippingCompany: null,
    shippingTrackingNumber: null,
    shippingPaidAt: null,
    shippingPaymentStatus: "unpaid",
    settlementStatus: "pending",
    settlementDate: null,
    settlementReference: null,
    settlementNotes: null,
    financialStatus: "expected",
    returnReason: null,
    returnShippingCost: 0,
    productRecoverableValue: 0,
    productLostCost: 0,
    returnAdditionalExpenses: 0,
    customerRefund: 0,
    deliveredAt: null,
    returnedAt: null,
    cancelledAt: null,
  };
}

export type Order = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  createdAt: string;
  shippedAt: string | null;
  name: string;
  email: string;
  phone: string;
  address: string;
  governorate: string;
  notes: string | null;
  items: OrderLine[];
  total: number;
  trackingToken: string;
  finance: OrderFinance;
};

function str(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
}

function num(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) {
      return Number(value);
    }
  }
  return 0;
}

function nullableNum(row: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = row[key];
    if (value == null || value === "") continue;
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) {
      return Number(value);
    }
  }
  return null;
}

function parseItems(raw: unknown): OrderLine[] {
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const row = (item ?? {}) as Record<string, unknown>;
    return {
      name: str(row, ["name", "title", "product_name", "productName", "label"]),
      slug: str(row, ["slug", "product_slug", "productSlug"]),
      quantity: num(row, ["quantity", "qty", "count"]) || 1,
      price: num(row, ["price", "unit_price", "unitPrice", "amount", "total"]),
      image: str(row, ["image", "image_url", "imageUrl", "img", "thumbnail"]) || undefined,
    };
  });
}

const STATUS_SET = new Set<OrderStatus>([
  "pending",
  "received",
  "confirmed",
  "preparing",
  "shipped",
  "out_for_delivery",
  "delivered",
  "delivery_failed",
  "return_requested",
  "returning",
  "returned",
  "cancelled",
]);

export function normalizeStatus(raw: string): OrderStatus {
  const value = raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (STATUS_SET.has(value as OrderStatus)) return value as OrderStatus;
  if (value === "out for delivery") return "out_for_delivery";
  if (value === "new") return "pending";
  return "pending";
}

function mapFinance(row: Record<string, unknown>): OrderFinance {
  const base = emptyFinance();
  const shippingPayment = str(row, ["shipping_payment_status"]).toLowerCase();
  const settlement = str(row, ["settlement_status"]).toLowerCase();
  const financial = str(row, ["financial_status"]).toLowerCase();

  return {
    ...base,
    productSubtotal: nullableNum(row, ["product_subtotal"]),
    shippingFeeCharged: nullableNum(row, ["shipping_fee_charged"]),
    shippingCompanyCost: nullableNum(row, ["shipping_company_cost"]),
    productCost: nullableNum(row, ["product_cost"]),
    packagingCost: nullableNum(row, ["packaging_cost"]) ?? 0,
    advertisingCost: nullableNum(row, ["advertising_cost"]) ?? 0,
    otherExpenses: nullableNum(row, ["other_expenses"]) ?? 0,
    otherExpensesNote: str(row, ["other_expenses_note"]) || null,
    amountCollected: nullableNum(row, ["amount_collected"]),
    amountReceived: nullableNum(row, ["amount_received"]),
    shippingCompany: str(row, ["shipping_company"]) || null,
    shippingTrackingNumber: str(row, ["shipping_tracking_number"]) || null,
    shippingPaidAt: str(row, ["shipping_paid_at"]) || null,
    shippingPaymentStatus: (
      ["unpaid", "paid", "waived"].includes(shippingPayment)
        ? shippingPayment
        : "unpaid"
    ) as ShippingPaymentStatus,
    settlementStatus: (
      ["pending", "partially_received", "received", "disputed"].includes(settlement)
        ? settlement
        : "pending"
    ) as SettlementStatus,
    settlementDate: str(row, ["settlement_date"]) || null,
    settlementReference: str(row, ["settlement_reference"]) || null,
    settlementNotes: str(row, ["settlement_notes"]) || null,
    financialStatus: (
      ["expected", "realized", "loss", "cancelled", "incomplete"].includes(financial)
        ? financial
        : "expected"
    ) as FinancialStatus,
    returnReason: str(row, ["return_reason"]) || null,
    returnShippingCost: nullableNum(row, ["return_shipping_cost"]) ?? 0,
    productRecoverableValue: nullableNum(row, ["product_recoverable_value"]) ?? 0,
    productLostCost: nullableNum(row, ["product_lost_cost"]) ?? 0,
    returnAdditionalExpenses: nullableNum(row, ["return_additional_expenses"]) ?? 0,
    customerRefund: nullableNum(row, ["customer_refund"]) ?? 0,
    deliveredAt: str(row, ["delivered_at"]) || null,
    returnedAt: str(row, ["returned_at"]) || null,
    cancelledAt: str(row, ["cancelled_at"]) || null,
  };
}

export function mapOrder(raw: unknown): Order | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const id = str(row, ["id"]);
  if (!id) return null;

  const items = parseItems(
    row.items ?? row.line_items ?? row.lineItems ?? row.products
  );

  const total =
    num(row, ["total", "total_egp", "amount", "grand_total", "total_price"]) ||
    items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const finance = mapFinance(row);
  if (finance.productSubtotal == null) {
    finance.productSubtotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
  }
  if (finance.shippingFeeCharged == null) {
    finance.shippingFeeCharged = Math.max(total - finance.productSubtotal, 0);
  }

  return {
    id,
    orderNumber:
      str(row, ["order_number", "orderNumber", "number", "order_no"]) ||
      id.slice(0, 8).toUpperCase(),
    status: normalizeStatus(str(row, ["status"])),
    createdAt: str(row, ["created_at", "createdAt"]) || new Date().toISOString(),
    shippedAt: str(row, ["shipped_at", "shippedAt"]) || null,
    name: str(row, ["name", "customer_name", "customerName", "full_name", "fullName"]),
    email: str(row, ["email", "customer_email", "customerEmail"]),
    phone: str(row, ["phone", "customer_phone", "customerPhone", "mobile"]),
    address: str(row, [
      "address",
      "shipping_address",
      "street",
      "street_address",
    ]),
    governorate: str(row, ["governorate", "gov", "city", "state"]),
    notes: str(row, ["notes", "note", "customer_notes"]) || null,
    items,
    total,
    trackingToken: str(row, ["tracking_token", "trackingToken", "token"]),
    finance,
  };
}

export function formatEgp(value: number) {
  return `${new Intl.NumberFormat("en-EG", {
    maximumFractionDigits: 2,
  }).format(value)} EGP`;
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
