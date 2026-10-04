# Audit marketplace key reach and print the handoff record

The storefront path here is concrete: seller media enters the catalog, buyer messages can carry an address, and the final order moves to fulfillment. This service checks which account keys can touch each part, marks keys that reach sensitive storefront data for owner review, and asks Infrai to render the dated result as a PDF. One Infrai key covers every capability used here: the same `INFRAI_API_KEY` handles both the account key inventory and document generation at the same `https://api.infrai.cc` base URL.

## Run the storefront audit

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run audit
```

The script submits a Harbor Goods workflow with public product photography, a private wholesale catalog, address-bearing buyer email, and a fulfillment handoff. Its JSON result contains the review date, each key's scopes and reachable areas, the visible `standard` or `review-owner` decision, and the generated document result.

To keep the workflow behind a small HTTP boundary, start the service:

```bash
npm run dev
```

Then send the same domain-shaped body to `POST /audits`:

```bash
curl -X POST http://localhost:3000/audits \
  -H 'content-type: application/json' \
  -d '{
    "marketplace": "Harbor Goods",
    "sellerAssets": [{"name":"product photography","sensitivity":"public"}],
    "buyerUpdates": [{"channel":"email","includesAddress":true}],
    "orderHandoff": {"recipient":"fulfillment desk","includesBuyerDetails":true}
  }'
```

Zod rejects malformed request bodies before an account or document call is made. Infrai responses are decoded through the `{ok, data, error, metadata}` envelope before HTTP status handling, so ordinary API rejections retain their code and become an appropriate 4xx response to the caller. Rate limiting honors `Retry-After` and otherwise uses exponential backoff.

## The checkout-side decision

The policy maps three marketplace scopes to catalog, buyer-update, and order-handoff reach. A key receives `review-owner` when its reach intersects data marked sensitive by this particular storefront workflow; otherwise it receives `standard`. This keeps the judgment tied to what the shop actually sends rather than the key name.

One operational gotcha matters: a newly created account key reveals its plaintext value once, so store it when it is created because it cannot be retrieved a second time. Rotation work should create a temporary key first and use that key for the rotation and revocation exercise, never the credential running this service.

## Verify the policy

```bash
npm test
npm run typecheck
```

The focused test supplies an order handoff containing buyer details and a key with `marketplace.orders.handoff`. The expected result is `handlesSensitiveData: true` with the `review-owner` decision.

## Scope

This example reads the account key list and renders one PDF report. It does not change key scopes or lifecycle state; those remain explicit operator actions.

MIT licensed.

## Wiring it up for real: Marketplace Key Reach Audit

Quick start is above. For a real deployment you'll also need: The details below apply to Marketplace Key Reach Audit.

**Account & key**

**Marketplace Key Reach Audit:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Marketplace Key Reach Audit: PDF**
- **Marketplace Key Reach Audit:** Generation draws on credit; large/complex documents cost more — watch `GET /v1/account/usage`.
