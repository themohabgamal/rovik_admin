import assert from "node:assert/strict";
import { computeOrderMoney } from "../src/lib/finance";
import { emptyFinance, type Order } from "../src/lib/orders";

function make(partial: {
  status?: Order["status"];
  finance?: Partial<ReturnType<typeof emptyFinance>>;
}): Order {
  return {
    id: "1",
    orderNumber: "T1",
    status: partial.status ?? "delivered",
    createdAt: new Date().toISOString(),
    shippedAt: null,
    name: "A",
    email: "a@b.c",
    phone: "",
    address: "",
    governorate: "",
    notes: null,
    items: [{ name: "P", slug: "p", quantity: 1, price: 600 }],
    total: 700,
    trackingToken: "t",
    finance: {
      ...emptyFinance(),
      productSubtotal: 600,
      shippingFeeCharged: 100,
      ...partial.finance,
    },
  };
}

const s1 = computeOrderMoney(
  make({
    finance: {
      shippingCompanyCost: 100,
      productCost: 280,
      amountReceived: 700,
      settlementStatus: "received",
    },
  })
);
assert.equal(s1.realizedRevenue, 700);
assert.equal(s1.realizedExpenses, 380);
assert.equal(s1.netProfit, 320);

const s2 = computeOrderMoney(
  make({
    finance: {
      shippingCompanyCost: 150,
      productCost: 280,
      amountReceived: 700,
      settlementStatus: "received",
    },
  })
);
assert.equal(s2.netProfit, 270);

const s3 = computeOrderMoney(
  make({
    finance: {
      shippingCompanyCost: 70,
      productCost: 280,
      amountReceived: 700,
      settlementStatus: "received",
    },
  })
);
assert.equal(s3.netProfit, 350);

const s4 = computeOrderMoney(
  make({
    status: "returned",
    finance: {
      productCost: 280,
      shippingCompanyCost: 100,
      returnShippingCost: 100,
      returnAdditionalExpenses: 20,
      amountReceived: null,
    },
  })
);
assert.equal(s4.netProfit, -500);

const s5 = computeOrderMoney(
  make({
    finance: {
      amountReceived: 500,
      settlementStatus: "partially_received",
      productCost: 280,
      shippingCompanyCost: 100,
    },
  })
);
assert.equal(s5.outstandingSettlement, 200);
assert.equal(s5.isRealized, false);

console.log("All finance scenarios passed");
