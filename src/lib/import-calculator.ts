export type StockType = "import" | "local";

export type ImportProductLine = {
  id: string;
  label: string;
  quantity: number;
  /** Supplier unit price in USD (import stock). */
  unitPriceUsd: number;
  /** Base product cost in EGP (local stock). */
  unitCostEgp: number;
  /** Optional link to catalog product. */
  productId?: string | null;
  sortOrder: number;
};

export type ImportExpenseLine = {
  id: string;
  name: string;
  amount: number;
  currency: "USD" | "EGP";
  notes?: string;
};

export type ImportOrderInput = {
  stockType: StockType;
  exchangeRate: number;
  internationalShippingUsd: number;
  products: ImportProductLine[];
  expenses: ImportExpenseLine[];
};

export type ImportProductResult = {
  id: string;
  label: string;
  quantity: number;
  unitPriceUsd: number;
  unitCostEgp: number;
  groupValueUsd: number;
  groupProductCostEgp: number;
  sharePercent: number;
  unitProductCostEgp: number;
  allocatedShippingEgp: number;
  allocatedExpensesEgp: number;
  totalGroupCostEgp: number;
  finalCostPerUnitEgp: number;
};

export type ImportCalculation = {
  stockType: StockType;
  exchangeRate: number;
  totalUnits: number;
  totalProductCostUsd: number;
  totalProductCostEgp: number;
  internationalShippingUsd: number;
  internationalShippingEgp: number;
  totalAdditionalExpensesEgp: number;
  totalUsdCosts: number;
  totalUsdCostsEgp: number;
  grandTotalLandedEgp: number;
  averageCostPerUnitEgp: number;
  expenseBreakdown: { name: string; amountEgp: number }[];
  customsTotalEgp: number;
  adsTotalEgp: number;
  packagingTotalEgp: number;
  products: ImportProductResult[];
};

export function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function formatUsd(value: number) {
  return `${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)} USD`;
}

export function formatEgp(value: number) {
  return `${new Intl.NumberFormat("en-EG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)} EGP`;
}

export function toEgp(
  amount: number,
  currency: "USD" | "EGP",
  exchangeRate: number
) {
  if (currency === "USD") return roundMoney(amount * exchangeRate);
  return roundMoney(amount);
}

function expenseCategoryTotal(
  expenses: ImportExpenseLine[],
  rate: number,
  keywords: string[]
) {
  return roundMoney(
    expenses.reduce((sum, expense) => {
      const name = expense.name.toLowerCase();
      const hit = keywords.some((word) => name.includes(word));
      if (!hit) return sum;
      return sum + toEgp(expense.amount, expense.currency, rate);
    }, 0)
  );
}

export function calculateImportOrder(input: ImportOrderInput): ImportCalculation {
  const stockType = input.stockType === "local" ? "local" : "import";
  const rate = Math.max(input.exchangeRate, 0);
  const products = [...input.products].sort((a, b) => a.sortOrder - b.sortOrder);

  const groupValues = products.map((product) => {
    const quantity = Math.max(product.quantity, 0);
    const unitPriceUsd = Math.max(product.unitPriceUsd, 0);
    const unitCostEgp =
      stockType === "local"
        ? Math.max(product.unitCostEgp, 0)
        : roundMoney(unitPriceUsd * rate);
    const groupValueUsd = roundMoney(quantity * unitPriceUsd);
    const groupProductCostEgp =
      stockType === "local"
        ? roundMoney(quantity * unitCostEgp)
        : roundMoney(groupValueUsd * rate);

    return {
      ...product,
      quantity,
      unitPriceUsd,
      unitCostEgp,
      groupValueUsd,
      groupProductCostEgp,
    };
  });

  const totalProductCostUsd = roundMoney(
    groupValues.reduce((sum, row) => sum + row.groupValueUsd, 0)
  );
  const totalProductCostEgp =
    stockType === "local"
      ? roundMoney(
          groupValues.reduce((sum, row) => sum + row.groupProductCostEgp, 0)
        )
      : roundMoney(totalProductCostUsd * rate);

  const internationalShippingUsd =
    stockType === "local"
      ? 0
      : roundMoney(Math.max(input.internationalShippingUsd, 0));
  const internationalShippingEgp = roundMoney(internationalShippingUsd * rate);

  const expenseBreakdown = input.expenses.map((expense) => ({
    name: expense.name.trim() || "Expense",
    amountEgp: toEgp(Math.max(expense.amount, 0), expense.currency, rate),
  }));

  const totalAdditionalExpensesEgp = roundMoney(
    expenseBreakdown.reduce((sum, row) => sum + row.amountEgp, 0)
  );

  const totalUsdCosts = roundMoney(totalProductCostUsd + internationalShippingUsd);
  const totalUsdCostsEgp = roundMoney(totalUsdCosts * rate);
  const grandTotalLandedEgp = roundMoney(
    totalProductCostEgp + internationalShippingEgp + totalAdditionalExpensesEgp
  );

  const totalUnits = groupValues.reduce((sum, row) => sum + row.quantity, 0);
  const shareBase =
    stockType === "local" ? totalProductCostEgp : totalProductCostUsd;

  const productResults: ImportProductResult[] = groupValues.map((row) => {
    const rowShareValue =
      stockType === "local" ? row.groupProductCostEgp : row.groupValueUsd;
    const sharePercent =
      shareBase > 0
        ? roundMoney((rowShareValue / shareBase) * 100)
        : groupValues.length > 0
          ? roundMoney(100 / groupValues.length)
          : 0;
    const share = shareBase > 0 ? rowShareValue / shareBase : 0;

    const unitProductCostEgp = row.unitCostEgp;
    const allocatedShippingEgp = roundMoney(internationalShippingEgp * share);
    const allocatedExpensesEgp = roundMoney(totalAdditionalExpensesEgp * share);
    const totalGroupCostEgp = roundMoney(
      row.groupProductCostEgp + allocatedShippingEgp + allocatedExpensesEgp
    );
    const finalCostPerUnitEgp =
      row.quantity > 0 ? roundMoney(totalGroupCostEgp / row.quantity) : 0;

    return {
      id: row.id,
      label: row.label,
      quantity: row.quantity,
      unitPriceUsd: row.unitPriceUsd,
      unitCostEgp: row.unitCostEgp,
      groupValueUsd: row.groupValueUsd,
      groupProductCostEgp: row.groupProductCostEgp,
      sharePercent,
      unitProductCostEgp,
      allocatedShippingEgp,
      allocatedExpensesEgp,
      totalGroupCostEgp,
      finalCostPerUnitEgp,
    };
  });

  return {
    stockType,
    exchangeRate: rate,
    totalUnits,
    totalProductCostUsd,
    totalProductCostEgp,
    internationalShippingUsd,
    internationalShippingEgp,
    totalAdditionalExpensesEgp,
    totalUsdCosts,
    totalUsdCostsEgp,
    grandTotalLandedEgp,
    averageCostPerUnitEgp:
      totalUnits > 0 ? roundMoney(grandTotalLandedEgp / totalUnits) : 0,
    expenseBreakdown,
    customsTotalEgp: expenseCategoryTotal(input.expenses, rate, [
      "custom",
      "duty",
      "tax",
    ]),
    adsTotalEgp: expenseCategoryTotal(input.expenses, rate, [
      "ad",
      "advert",
      "marketing",
    ]),
    packagingTotalEgp: expenseCategoryTotal(input.expenses, rate, [
      "pack",
      "box",
      "wrap",
    ]),
    products: productResults,
  };
}

export function newProductLine(partial?: Partial<ImportProductLine>): ImportProductLine {
  return {
    id: crypto.randomUUID(),
    label: partial?.label ?? "",
    quantity: partial?.quantity ?? 1,
    unitPriceUsd: partial?.unitPriceUsd ?? 0,
    unitCostEgp: partial?.unitCostEgp ?? 0,
    productId: partial?.productId ?? null,
    sortOrder: partial?.sortOrder ?? 0,
  };
}

export function newExpenseLine(partial?: Partial<ImportExpenseLine>): ImportExpenseLine {
  return {
    id: crypto.randomUUID(),
    name: partial?.name ?? "",
    amount: partial?.amount ?? 0,
    currency: partial?.currency ?? "EGP",
    notes: partial?.notes ?? "",
  };
}

export function defaultImportDraft(): ImportOrderInput & {
  name: string;
  supplierName: string;
  orderDate: string;
  status: "draft" | "completed";
} {
  return {
    stockType: "import",
    name: "China light bar shipment",
    supplierName: "",
    orderDate: new Date().toISOString().slice(0, 10),
    status: "draft",
    exchangeRate: 50.25,
    internationalShippingUsd: 219,
    products: [
      newProductLine({ label: "30cm", quantity: 50, unitPriceUsd: 3.2, sortOrder: 0 }),
      newProductLine({ label: "40cm", quantity: 3, unitPriceUsd: 2.5, sortOrder: 1 }),
      newProductLine({ label: "44cm", quantity: 3, unitPriceUsd: 2.5, sortOrder: 2 }),
    ],
    expenses: [
      newExpenseLine({ name: "Customs", amount: 0, currency: "EGP" }),
      newExpenseLine({ name: "Local shipping", amount: 4000, currency: "EGP" }),
      newExpenseLine({ name: "Ads", amount: 3000, currency: "EGP" }),
    ],
  };
}

export function defaultLocalDraft(): ImportOrderInput & {
  name: string;
  supplierName: string;
  orderDate: string;
  status: "draft" | "completed";
} {
  return {
    stockType: "local",
    name: "Local stock batch",
    supplierName: "",
    orderDate: new Date().toISOString().slice(0, 10),
    status: "draft",
    exchangeRate: 50.25,
    internationalShippingUsd: 0,
    products: [
      newProductLine({
        label: "",
        quantity: 1,
        unitCostEgp: 0,
        sortOrder: 0,
      }),
    ],
    expenses: [
      newExpenseLine({ name: "Packaging", amount: 0, currency: "EGP" }),
      newExpenseLine({ name: "Ads", amount: 0, currency: "EGP" }),
      newExpenseLine({ name: "Other", amount: 0, currency: "EGP" }),
    ],
  };
}

export function parseStockType(raw: unknown): StockType {
  return String(raw ?? "import").toLowerCase() === "local" ? "local" : "import";
}

export function parseProductsJson(raw: unknown): ImportProductLine[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row, index) => {
      const item = (row ?? {}) as Record<string, unknown>;
      return {
        id: String(item.id ?? `product-${index}`),
        label: String(item.label ?? item.size ?? ""),
        quantity: Number(item.quantity) || 0,
        unitPriceUsd: Number(item.unit_price_usd ?? item.unitPriceUsd) || 0,
        unitCostEgp: Number(item.unit_cost_egp ?? item.unitCostEgp) || 0,
        productId: item.product_id
          ? String(item.product_id)
          : item.productId
            ? String(item.productId)
            : null,
        sortOrder: Number(item.sort_order ?? item.sortOrder ?? index),
      };
    })
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function parseExpensesJson(raw: unknown): ImportExpenseLine[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((row) => {
    const item = (row ?? {}) as Record<string, unknown>;
    const currencyRaw = String(item.currency ?? "EGP").toUpperCase();
    return {
      id: String(item.id ?? `expense-${Math.random().toString(36).slice(2)}`),
      name: String(item.name ?? ""),
      amount: Number(item.amount) || 0,
      currency: currencyRaw === "USD" ? "USD" : "EGP",
      notes: String(item.notes ?? ""),
    };
  });
}

export function productsToJson(products: ImportProductLine[]) {
  return products.map((product, index) => ({
    id: product.id,
    label: product.label,
    quantity: product.quantity,
    unit_price_usd: product.unitPriceUsd,
    unit_cost_egp: product.unitCostEgp,
    product_id: product.productId ?? null,
    sort_order: product.sortOrder ?? index,
  }));
}

export function expensesToJson(expenses: ImportExpenseLine[]) {
  return expenses.map((expense) => ({
    id: expense.id,
    name: expense.name,
    amount: expense.amount,
    currency: expense.currency,
    notes: expense.notes ?? "",
  }));
}
