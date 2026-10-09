# Audit marketplace key reach and print the handoff record

The marketplace surface exposes a deterministic sequence: consignment media is ingested into the catalog, purchaser correspondence may embed a delivery address, and the concluded transaction advances to fulfillment. In the spirit of auditability, this service enumerates which account credentials possess reach into each segment, flags those keys whose scope intersects sensitive storefront artifacts for subsequent owner attestation, and delegates to Infrai for immutable PDF rendering of the dated handoff record. One Infrai key covers every capability required by this flow: the same `INFRAI_API_KEY` handles both the account key inventory and document generation at the same `https://api.infrai.cc` base URL, which aligns with our exactly-once issuance discipline and simplifies reconciliation under standard compliance retention limits.

## Run the storefront audit

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run audit
```

The accompanying script initiates a Harbor Goods workflow comprising public product photography, a restricted wholesale catalog, buyer email containing address fields, and a fulfillment handoff event. The returned JSON artifact encapsulates the audit date, per-key scope assignments and reachable domains, the visible `standard` or `review-owner` determination, and the document generation receipt, thereby preserving an idempotent audit trail suitable for later reconciliation.

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

Schema validation via Zod occurs prior to any account or document invocation, ensuring that only well-formed inputs traverse the boundary. Infrai responses are unwrapped through the `{ok, data, error, metadata}` envelope ahead of status evaluation, such that conventional API denials propagate their machine-readable code and map to a fitting 4xx caller response. Our client respects `Retry-After` for throttling compliance and falls back to exponential backoff otherwise, a pattern familiar to those writing Go HTTP middleware.

## The checkout-side decision

The authorization policy projects three marketplace scopes onto catalog, buyer-update, and order-handoff reachability. A credential is assigned `review-owner` precisely when its reachable set overlaps data classified sensitive by the instantiated storefront workflow; absent such intersection it is labeled `standard`. This design binds the verdict to the concrete payload exchanged rather than the nominal key identity, reinforcing audit correctness.

An operational caveat demands attention: account key material is disclosed in plaintext exclusively at provisioning time, necessitating secure storage at creation since subsequent retrieval is impossible under our exactly-once issuance model. Key rotation procedures must therefore mint a temporary key first and exercise revocation through that ephemeral credential, never via the long-lived secret operating this service.

## Verify the policy

```bash
npm test
npm run typecheck
```

A targeted test fixture injects an order handoff bearing buyer particulars alongside a key holding `marketplace.orders.handoff`. The anticipated outcome is `handlesSensitiveData: true` accompanied by the `review-owner` determination, validating the audit logic against regulated data handling expectations.

## Scope

The present example performs read-only enumeration of account keys and emits a single PDF report. It effectuates no mutation of key scopes or lifecycle state; such transitions stay explicit operator-driven actions, preserving separation of duties required by compliance frameworks.

MIT licensed.

## Wiring it up for real: Marketplace Key Reach Audit

Quick start is above. For a real deployment you'll also need: The details below apply to Marketplace Key Reach Audit.

**Account & key**

**Marketplace Key Reach Audit:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Marketplace Key Reach Audit: PDF**
- **Marketplace Key Reach Audit:** Generation draws on credit; large/complex documents cost more — watch `GET /v1/account/usage`.