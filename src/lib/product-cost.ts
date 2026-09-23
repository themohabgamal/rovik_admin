import { formatEgp, formatSignedEgp, roundMoney } from "@/lib/money";

export type ExpenseCurrency = "USD" | "EGP";

export type ProductExpense = {
  id: string;
  productId: string;
  name: string;
  amount: number;
  currency: ExpenseCurrency;
  quantity: number;
  note: string | null;
  occurredAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProductCostInput = {
  price: number;
  baseCost: number | null;
  costCurrency: ExpenseCurrency;
  expenses: ProductExpense[];
  usdEgpRate: number;
};

export type ProductCostBreakdown = {
  sellingPriceEgp: number;
  baseCostEgp: number;
  expensesTotalEgp: number;
  expensesPerUnitEgp: number;
  trueUnitCostEgp: number;
  profitPerUnitEgp: number;
  marginPercent: number | null;
  lines: {
    id: string;
    name: string;
    amount: number;
    currency: ExpenseCurrency;
    quantity: number;
    amountEgp: number;
    perUnitEgp: number;
    note: string | null;
    occurredAt: string | null;
  }[];
};

export function toEgp(
  amount: number,
  currency: ExpenseCurrency,
  usdEgpRate: number
) {
  const n = Number(amount) || 0;
  const rate = Math.max(Number(usdEgpRate) || 0, 0);
  if (currency === "USD") return roundMoney(n * rate);
  return roundMoney(n);
}

export function mapProductExpense(raw: unknown): ProductExpense | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const id = String(row.id ?? "");
  if (!id) return null;
  const currencyRaw = String(row.currency ?? "USD").toUpperCase();
  return {
    id,
    productId: String(row.product_id ?? ""),
    name: String(row.name ?? ""),
    amount: Number(row.amount) || 0,
    currency: currencyRaw === "EGP" ? "EGP" : "USD",
    quantity: Math.max(Number(row.quantity) || 1, 0.0001),
    note: row.note ? String(row.note) : null,
    occurredAt: row.occurred_at ? String(row.occurred_at) : null,
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

export function computeProductCost(
  input: ProductCostInput
): ProductCostBreakdown {
  const rate = Math.max(input.usdEgpRate, 0);
  const baseCostEgp =
    input.baseCost == null
      ? 0
      : toEgp(input.baseCost, input.costCurrency, rate);

  const lines = input.expenses.map((expense) => {
    const amountEgp = toEgp(expense.amount, expense.currency, rate);
    const perUnitEgp = roundMoney(amountEgp / Math.max(expense.quantity, 0.0001));
    return {
      id: expense.id,
      name: expense.name,
      amount: expense.amount,
      currency: expense.currency,
      quantity: expense.quantity,
      amountEgp,
      perUnitEgp,
      note: expense.note,
      occurredAt: expense.occurredAt,
    };
  });

  const expensesPerUnitEgp = roundMoney(
    lines.reduce((sum, line) => sum + line.perUnitEgp, 0)
  );
  const expensesTotalEgp = roundMoney(
    lines.reduce((sum, line) => sum + line.amountEgp, 0)
  );
  const trueUnitCostEgp = roundMoney(baseCostEgp + expensesPerUnitEgp);
  const sellingPriceEgp = roundMoney(input.price);
  const profitPerUnitEgp = roundMoney(sellingPriceEgp - trueUnitCostEgp);
  const marginPercent =
    sellingPriceEgp > 0
      ? roundMoney((profitPerUnitEgp / sellingPriceEgp) * 100)
      : null;

  return {
    sellingPriceEgp,
    baseCostEgp,
    expensesTotalEgp,
    expensesPerUnitEgp,
    trueUnitCostEgp,
    profitPerUnitEgp,
    marginPercent,
    lines,
  };
}

/** Map of product slug → true unit cost in EGP */
export function trueCostBySlug(
  products: {
    slug: string;
    price: number;
    cost: number | null;
    cost_currency?: string | null;
  }[],
  expensesByProductId: Map<string, ProductExpense[]>,
  productIdBySlug: Map<string, string>,
  usdEgpRate: number
) {
  const map = new Map<string, number>();
  for (const product of products) {
    const id = productIdBySlug.get(product.slug);
    const expenses = id ? expensesByProductId.get(id) ?? [] : [];
    const currency =
      String(product.cost_currency ?? "EGP").toUpperCase() === "USD"
        ? "USD"
        : "EGP";
    const breakdown = computeProductCost({
      price: product.price,
      baseCost: product.cost,
      costCurrency: currency,
      expenses,
      usdEgpRate,
    });
    map.set(product.slug, breakdown.trueUnitCostEgp);
  }
  return map;
}

export function estimateOrderProductCost(
  items: { slug: string; quantity: number }[],
  costBySlug: Map<string, number>
) {
  return roundMoney(
    items.reduce((sum, item) => {
      const unit = costBySlug.get(item.slug);
      if (unit == null) return sum;
      return sum + unit * item.quantity;
    }, 0)
  );
}

/** Build slug → true unit cost (EGP) from product + expense rows. */
export function buildTrueCostBySlug(
  products: {
    id: string;
    slug: string;
    price: number;
    cost: number | null;
    cost_currency?: string | null;
  }[],
  expenses: unknown[],
  usdEgpRate: number
) {
  const expensesByProductId = new Map<string, ProductExpense[]>();
  const productIdBySlug = new Map<string, string>();

  for (const product of products) {
    productIdBySlug.set(product.slug, product.id);
  }
  for (const raw of expenses) {
    const expense = mapProductExpense(raw);
    if (!expense) continue;
    const list = expensesByProductId.get(expense.productId) ?? [];
    list.push(expense);
    expensesByProductId.set(expense.productId, list);
  }

  return trueCostBySlug(products, expensesByProductId, productIdBySlug, usdEgpRate);
}

export { formatEgp, formatSignedEgp };
