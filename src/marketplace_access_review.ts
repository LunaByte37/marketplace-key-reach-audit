import { z } from "zod";

export const auditRequestSchema = z.object({
  marketplace: z.string().min(1),
  sellerAssets: z.array(z.object({
    name: z.string().min(1),
    sensitivity: z.enum(["public", "seller-private"])
  })).min(1),
  buyerUpdates: z.array(z.object({
    channel: z.enum(["email", "sms"]),
    includesAddress: z.boolean()
  })).min(1),
  orderHandoff: z.object({
    recipient: z.string().min(1),
    includesBuyerDetails: z.boolean()
  })
});

export type AuditRequest = z.infer<typeof auditRequestSchema>;

export const listedKeySchema = z.object({
  id: z.string(),
  name: z.string().default("unnamed key"),
  scopes: z.array(z.string()).default([])
}).passthrough();

export type ListedKey = z.infer<typeof listedKeySchema>;

export type ReachArea = "catalog" | "buyer-updates" | "order-handoff";

const scopeReach: Readonly<Record<string, ReachArea>> = {
  "marketplace.assets.read": "catalog",
  "marketplace.buyer_updates.write": "buyer-updates",
  "marketplace.orders.handoff": "order-handoff"
};

export function reviewKeyReach(input: AuditRequest, keys: ListedKey[]) {
  const sensitiveAreas = new Set<ReachArea>();
  if (input.sellerAssets.some((asset) => asset.sensitivity === "seller-private")) sensitiveAreas.add("catalog");
  if (input.buyerUpdates.some((update) => update.includesAddress)) sensitiveAreas.add("buyer-updates");
  if (input.orderHandoff.includesBuyerDetails) sensitiveAreas.add("order-handoff");

  return keys.map((key) => {
    const reaches = [...new Set(key.scopes.map((scope) => scopeReach[scope]).filter((area): area is ReachArea => Boolean(area)))];
    return {
      id: key.id,
      name: key.name,
      scopes: key.scopes,
      reaches,
      handlesSensitiveData: reaches.some((area) => sensitiveAreas.has(area)),
      decision: reaches.some((area) => sensitiveAreas.has(area)) ? "review-owner" as const : "standard" as const
    };
  });
}

export function renderDatedReview(input: AuditRequest, reviewedAt: string, reviews: ReturnType<typeof reviewKeyReach>): string {
  const rows = reviews.map((review) =>
    `| ${review.name} | ${review.scopes.join(", ") || "none"} | ${review.reaches.join(", ") || "none"} | ${review.decision} |`
  ).join("\n");

  return `# ${input.marketplace} access review\n\nDate: ${reviewedAt}\n\n` +
    `Seller assets: ${input.sellerAssets.map((asset) => asset.name).join(", ")}\n\n` +
    `Buyer update channels: ${input.buyerUpdates.map((update) => update.channel).join(", ")}\n\n` +
    `Order handoff: ${input.orderHandoff.recipient}\n\n` +
    `| Key | Scopes | Reach | Decision |\n| --- | --- | --- | --- |\n${rows}\n`;
}
