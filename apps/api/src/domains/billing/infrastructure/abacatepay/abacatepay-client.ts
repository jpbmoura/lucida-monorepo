import { z } from "zod";
import { env } from "@/env.js";
import { AbacatePayUpstreamError } from "../../domain/billing-errors.js";

/**
 * Cliente HTTP fino pra API v2 da AbacatePay. Em vez de depender do SDK
 * deprecated (`abacatepay-nodejs-sdk`) ou do `@abacatepay/sdk` v2 — que
 * ainda não tem docs/repo público estável — falamos direto com a REST e
 * validamos o response com Zod.
 *
 * Trocar por SDK no futuro é só substituir essa implementação; nada do
 * use case (`CreatePixTopupUseCase`) precisa mudar.
 */

const ABACATEPAY_BASE_URL = "https://api.abacatepay.com";

// ─── Response shapes (Zod) ─────────────────────────────────────────────

/**
 * Status que a AbacatePay devolve em `data.status`. A doc lista PENDING
 * na criação; PAID / EXPIRED / REFUNDED / CANCELLED aparecem em queries
 * subsequentes ou nos webhooks. Usamos passthrough no enum pra não
 * quebrar se eles introduzirem um novo valor — caímos em FAILED.
 */
const pixStatusSchema = z.enum([
  "PENDING",
  "PAID",
  "EXPIRED",
  "REFUNDED",
  "CANCELLED",
]);

const createTransparentResponseSchema = z.object({
  data: z.object({
    id: z.string().min(1),
    amount: z.number().int(),
    status: pixStatusSchema,
    brCode: z.string().min(1),
    brCodeBase64: z.string().min(1),
    expiresAt: z.string().min(1),
    metadata: z.record(z.unknown()).optional(),
  }),
  // V2 padroniza `success: true`; mantemos optional pra resiliência.
  success: z.boolean().optional(),
});

export type AbacatePayPixStatus = z.infer<typeof pixStatusSchema>;

export interface CreatePixQrCodeInput {
  /** Em centavos. AbacatePay aceita inteiro positivo. */
  amountCents: number;
  description: string;
  /** Janela de validade em segundos. Default 30min. */
  expiresInSeconds: number;
  customer: {
    name: string;
    email: string;
    /** Apenas dígitos (CPF 11 ou CNPJ 14). AbacatePay aceita com e sem máscara, mas a gente normaliza pra dígitos. */
    taxId: string;
    /** Opcional na doc, mas a maioria dos exemplos pede. Se ausente, manda string vazia — AbacatePay tolera. */
    cellphone?: string;
  };
  /** `metadata.ownerId`/`metadata.topupId` reconciliam o webhook de volta ao ledger. */
  metadata?: Record<string, string>;
}

export interface CreatedPixQrCode {
  id: string;
  amountCents: number;
  status: AbacatePayPixStatus;
  brCode: string;
  brCodeBase64: string;
  expiresAt: Date;
}

export interface AbacatePayClient {
  createPixQrCode(input: CreatePixQrCodeInput): Promise<CreatedPixQrCode>;
}

// ─── Implementação fetch ──────────────────────────────────────────────

class FetchAbacatePayClient implements AbacatePayClient {
  constructor(private readonly apiKey: string) {}

  async createPixQrCode(input: CreatePixQrCodeInput): Promise<CreatedPixQrCode> {
    const url = `${ABACATEPAY_BASE_URL}/v2/transparents/create`;

    const body = {
      method: "PIX" as const,
      data: {
        amount: input.amountCents,
        description: input.description,
        expiresIn: input.expiresInSeconds,
        customer: {
          name: input.customer.name,
          email: input.customer.email,
          taxId: input.customer.taxId,
          cellphone: input.customer.cellphone ?? "",
        },
        metadata: input.metadata ?? {},
      },
    };

    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      throw new AbacatePayUpstreamError(
        `falha de rede chamando AbacatePay (${(err as Error).message})`,
      );
    }

    if (!res.ok) {
      // Tenta extrair message do payload de erro pra logar melhor; cai em
      // statusText se não for JSON.
      const detail = await safeReadErrorMessage(res);
      throw new AbacatePayUpstreamError(`HTTP ${res.status}: ${detail}`);
    }

    const json = (await res.json()) as unknown;
    const parsed = createTransparentResponseSchema.safeParse(json);
    if (!parsed.success) {
      throw new AbacatePayUpstreamError(
        `resposta inesperada do AbacatePay: ${parsed.error.message}`,
      );
    }

    const expiresAt = new Date(parsed.data.data.expiresAt);
    if (Number.isNaN(expiresAt.getTime())) {
      throw new AbacatePayUpstreamError(
        `expiresAt inválido: ${parsed.data.data.expiresAt}`,
      );
    }

    return {
      id: parsed.data.data.id,
      amountCents: parsed.data.data.amount,
      status: parsed.data.data.status,
      brCode: parsed.data.data.brCode,
      brCodeBase64: parsed.data.data.brCodeBase64,
      expiresAt,
    };
  }
}

async function safeReadErrorMessage(res: Response): Promise<string> {
  try {
    const text = await res.text();
    if (!text) return res.statusText;
    try {
      const parsed = JSON.parse(text) as Record<string, unknown>;
      const candidate =
        (typeof parsed.error === "string" && parsed.error) ||
        (typeof parsed.message === "string" && parsed.message);
      return candidate || text;
    } catch {
      return text;
    }
  } catch {
    return res.statusText;
  }
}

// ─── Singleton + factory ──────────────────────────────────────────────

let cached: AbacatePayClient | null = null;

export function getAbacatePayClient(): AbacatePayClient {
  if (!env.ABACATEPAY_API_KEY) {
    throw new Error(
      "ABACATEPAY_API_KEY não configurado — módulo de PIX offline.",
    );
  }
  if (!cached) {
    cached = new FetchAbacatePayClient(env.ABACATEPAY_API_KEY);
  }
  return cached;
}

export function isAbacatePayConfigured(): boolean {
  return Boolean(env.ABACATEPAY_API_KEY);
}
