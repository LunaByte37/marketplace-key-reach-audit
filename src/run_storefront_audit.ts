import { InfraiClient } from "./infrai_client.js";
import { auditMarketplace } from "./marketplace_audit_service.js";

const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) throw new Error("Set INFRAI_API_KEY before running the audit");

const result = await auditMarketplace({
  marketplace: "Harbor Goods",
  sellerAssets: [
    { name: "product photography", sensitivity: "public" },
    { name: "wholesale catalog", sensitivity: "seller-private" }
  ],
  buyerUpdates: [{ channel: "email", includesAddress: true }],
  orderHandoff: { recipient: "fulfillment desk", includesBuyerDetails: true }
}, new InfraiClient(apiKey));

console.log(JSON.stringify(result, null, 2));
