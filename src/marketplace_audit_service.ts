import { z } from "zod";
import { InfraiClient } from "./infrai_client.js";
import {
  auditRequestSchema,
  listedKeySchema,
  renderDatedReview,
  reviewKeyReach
} from "./marketplace_access_review.js";

const keyListSchema = z.union([
  z.array(listedKeySchema),
  z.object({ keys: z.array(listedKeySchema) }).transform((value) => value.keys),
  z.object({
    items: z.array(z.object({
      key_id: z.string(),
      name: z.string().default("unnamed key")
    }).passthrough())
  }).transform((value) => value.items.map((key) => ({
    ...key,
    id: key.key_id,
    scopes: []
  })))
]);

export async function auditMarketplace(body: unknown, client: InfraiClient, now = new Date()) {
  const input = auditRequestSchema.parse(body);
  const keys = keyListSchema.parse(await client.listKeys());
  const reviews = reviewKeyReach(input, keys);
  const reviewDate = now.toISOString().slice(0, 10);
  const markdown = renderDatedReview(input, reviewDate, reviews);
  const document = await client.generatePdf(markdown);
  return { marketplace: input.marketplace, reviewDate, keys: reviews, document };
}
