import assert from "node:assert/strict";
import test from "node:test";
import { reviewKeyReach } from "../src/marketplace_access_review.js";
import { auditMarketplace } from "../src/marketplace_audit_service.js";

test("flags a fulfillment key that reaches buyer details for owner review", () => {
  const reviews = reviewKeyReach({
    marketplace: "Harbor Goods",
    sellerAssets: [{ name: "product photos", sensitivity: "public" }],
    buyerUpdates: [{ channel: "email", includesAddress: false }],
    orderHandoff: { recipient: "warehouse", includesBuyerDetails: true }
  }, [{
    id: "key_fulfillment",
    name: "fulfillment handoff",
    scopes: ["marketplace.orders.handoff"]
  }]);

  assert.deepEqual(reviews[0], {
    id: "key_fulfillment",
    name: "fulfillment handoff",
    scopes: ["marketplace.orders.handoff"],
    reaches: ["order-handoff"],
    handlesSensitiveData: true,
    decision: "review-owner"
  });
});

test("accepts the account key list response returned by Infrai", async () => {
  const client = {
    listKeys: async () => ({
      items: [{ key_id: "key_current", name: "current key", status: "active" }],
      next_cursor: null,
      count: 1
    }),
    generatePdf: async () => ({ id: "pdf_test" })
  };

  const result = await auditMarketplace({
    marketplace: "Harbor Goods",
    sellerAssets: [{ name: "product photos", sensitivity: "public" }],
    buyerUpdates: [{ channel: "email", includesAddress: false }],
    orderHandoff: { recipient: "warehouse", includesBuyerDetails: false }
  }, client as never, new Date("2026-10-02T00:00:00Z"));

  assert.deepEqual(result.keys, [{
    id: "key_current",
    name: "current key",
    scopes: [],
    reaches: [],
    handlesSensitiveData: false,
    decision: "standard"
  }]);
});
