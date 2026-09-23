import assert from "node:assert/strict";
import {
  calculateImportOrder,
  roundMoney,
  type ImportOrderInput,
} from "../src/lib/import-calculator";

const example: ImportOrderInput = {
  exchangeRate: 50.25,
  internationalShippingUsd: 219,
  products: [
    { id: "1", label: "30cm", quantity: 50, unitPriceUsd: 3.2, sortOrder: 0 },
    { id: "2", label: "40cm", quantity: 3, unitPriceUsd: 2.5, sortOrder: 1 },
    { id: "3", label: "44cm", quantity: 3, unitPriceUsd: 2.5, sortOrder: 2 },
  ],
  expenses: [
    { id: "e1", name: "Local shipping", amount: 4000, currency: "EGP" },
    { id: "e2", name: "Ads", amount: 3000, currency: "EGP" },
    { id: "e3", name: "Customs", amount: 0, currency: "EGP" },
  ],
};

const calc = calculateImportOrder(example);

assert.equal(calc.totalProductCostUsd, 175);
assert.equal(calc.totalUsdCosts, 394);
assert.equal(calc.totalAdditionalExpensesEgp, 7000);
assert.equal(calc.grandTotalLandedEgp, roundMoney(394 * 50.25 + 7000));

const thirty = calc.products.find((row) => row.label === "30cm");
assert.ok(thirty);
assert.equal(thirty.quantity, 50);
assert(thirty.finalCostPerUnitEgp > thirty.unitProductCostEgp);

const shareSum = roundMoney(
  calc.products.reduce((sum, row) => sum + row.sharePercent, 0)
);
assert(Math.abs(shareSum - 100) <= 0.02, `share sum ${shareSum}`);

const allocated = roundMoney(
  calc.products.reduce(
    (sum, row) => sum + row.allocatedShippingEgp + row.allocatedExpensesEgp,
    0
  )
);
assert.equal(
  allocated,
  roundMoney(calc.internationalShippingEgp + calc.totalAdditionalExpensesEgp)
);

console.log("Import calculator scenarios passed");
console.log("Grand total:", calc.grandTotalLandedEgp);
console.log(
  "30cm per unit:",
  calc.products.find((row) => row.label === "30cm")?.finalCostPerUnitEgp
);
