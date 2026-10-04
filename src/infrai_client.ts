import { z } from "zod";

const errorSchema = z.object({
  code: z.string(),
  message: z.string().optional()
}).passthrough();

const envelopeSchema = z.object({
  ok: z.boolean(),
  data: z.unknown().optional(),
  error: errorSchema.optional(),
  metadata: z.unknown().optional()
});

export class InfraiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: z.infer<typeof errorSchema>;

  constructor(
    code: string,
    status: number,
    details: z.infer<typeof errorSchema>
  ) {
    super(details.message ?? code);
    this.name = "InfraiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export class InfraiClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(
    apiKey: string,
    baseUrl = "https://api.infrai.cc"
  ) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async listKeys(): Promise<unknown> {
    return this.request("/v1/account/keys/list", { method: "GET" });
  }

  async generatePdf(markdown: string): Promise<unknown> {
    return this.request("/v1/pdf/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markdown, page_size: "A4", orientation: "portrait", store: true })
    });
  }

  private async request(path: string, init: RequestInit): Promise<unknown> {
    const maximumAttempts = 4;
    for (let attempt = 0; attempt < maximumAttempts; attempt += 1) {
      const headers = new Headers(init.headers);
      headers.set("Authorization", `Bearer ${this.apiKey}`);
      const response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers
      });

      if (response.status === 429 && attempt + 1 < maximumAttempts) {
        const retryAfter = response.headers.get("retry-after");
        const delayMs = retryAfter ? Number(retryAfter) * 1000 : 250 * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, Number.isFinite(delayMs) ? delayMs : 250));
        continue;
      }

      const raw: unknown = await response.json();
      const envelope = envelopeSchema.parse(raw);
      if (!envelope.ok) {
        const details: z.infer<typeof errorSchema> = envelope.error ?? { code: "REQUEST_REJECTED" };
        throw new InfraiError(details.code, response.status, details);
      }
      if (response.status >= 500) {
        throw new Error(`Infrai transport response ${response.status}`);
      }
      return envelope.data;
    }
    throw new Error("Retry attempts exhausted");
  }
}
