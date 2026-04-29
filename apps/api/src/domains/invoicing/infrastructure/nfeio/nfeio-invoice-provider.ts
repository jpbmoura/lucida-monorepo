import { z } from "zod";
import { env } from "@/env.js";
import {
  InvoiceProviderRejectedError,
  InvoiceProviderUpstreamError,
  InvoicingNotConfiguredError,
} from "../../domain/invoicing-errors.js";
import type {
  InvoiceProvider,
  IssueInvoiceInput,
  ProviderInvoiceResult,
  ProviderInvoiceStatus,
  TakerSnapshot,
} from "../../domain/invoice-provider.js";
import type { LucidaEmitterConfig } from "./lucida-emitter-config.js";

/**
 * Cliente HTTP fino pra NFE.io (api.nfe.io). Auth é por header
 * `Authorization` com a API key crua (sem prefixo Bearer — diferente do
 * Stripe/AbacatePay).
 *
 * Estrutura segue o padrão de `FetchAbacatePayClient`: classe que recebe
 * api key + base URL, métodos públicos por operação, response validado
 * com Zod, erros traduzidos pro domínio.
 *
 * **Status: scaffolding implementado, mapeamento body/response a confirmar
 * contra sandbox em PR 6.** Os shapes abaixo são meu melhor palpite das
 * docs do NFE.io. Quando o user tiver API key e Company configurada, a
 * primeira chamada vai mostrar se algo precisa ajustar — todo o ajuste
 * fica isolado em `buildIssuePayload`/`parseInvoiceResponse`.
 */

// ─── Status mapping ────────────────────────────────────────────────────

/**
 * NFE.io expõe `flowStatus` com valores em PascalCase. Mapeamos pros
 * 5 estados do nosso domínio. Qualquer valor não previsto cai em
 * `processing` — o worker reconsulta até bater num estado terminal.
 */
const NFEIO_STATUS_MAP: Record<string, ProviderInvoiceStatus> = {
  WaitingCalculateTaxes: "processing",
  WaitingDefineRpsNumber: "processing",
  WaitingSend: "processing",
  WaitingReturn: "processing",
  WaitingDownload: "processing",
  Issued: "issued",
  Cancelled: "cancelled",
  WaitingSendCancel: "processing",
  CancelFailed: "issued", // cancelamento falhou, mas nota segue válida
  IssueFailed: "failed",
  Error: "failed",
};

function mapFlowStatus(raw: string): ProviderInvoiceStatus {
  return NFEIO_STATUS_MAP[raw] ?? "processing";
}

// ─── Response shapes (Zod) ─────────────────────────────────────────────

const invoiceResponseSchema = z.object({
  id: z.string().min(1),
  flowStatus: z.string().min(1),
  pdfUrl: z.string().url().nullish(),
  xmlUrl: z.string().url().nullish(),
  rpsSerialNumber: z.string().nullish(),
  rpsNumber: z.union([z.number(), z.string()]).nullish(),
  flowMessage: z.string().nullish(),
});

type InvoiceResponse = z.infer<typeof invoiceResponseSchema>;

// ─── Implementation ────────────────────────────────────────────────────

export class NfeIoInvoiceProvider implements InvoiceProvider {
  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string,
    private readonly emitter: LucidaEmitterConfig,
  ) {}

  async issueInvoice(input: IssueInvoiceInput): Promise<ProviderInvoiceResult> {
    const url = `${this.baseUrl}/v1/companies/${this.emitter.companyId}/serviceinvoices`;
    const body = this.buildIssuePayload(input);

    const res = await this.request("POST", url, body);
    return this.toResult(this.parseInvoiceResponse(res));
  }

  async getInvoice(providerInvoiceId: string): Promise<ProviderInvoiceResult> {
    const url = `${this.baseUrl}/v1/companies/${this.emitter.companyId}/serviceinvoices/${encodeURIComponent(providerInvoiceId)}`;
    const res = await this.request("GET", url);
    return this.toResult(this.parseInvoiceResponse(res));
  }

  private toResult(parsed: InvoiceResponse): ProviderInvoiceResult {
    return {
      providerInvoiceId: parsed.id,
      status: mapFlowStatus(parsed.flowStatus),
      providerStatusRaw: parsed.flowStatus,
      pdfUrl: parsed.pdfUrl ?? null,
      xmlUrl: parsed.xmlUrl ?? null,
      rpsNumber:
        parsed.rpsNumber !== null && parsed.rpsNumber !== undefined
          ? String(parsed.rpsNumber)
          : null,
      rpsSeries: parsed.rpsSerialNumber ?? null,
      errorMessage: parsed.flowMessage ?? null,
    };
  }

  // ─── Payload mapping ─────────────────────────────────────────────────

  /**
   * Traduz nosso `IssueInvoiceInput` pro shape esperado pelo NFE.io.
   * Nomes de campo (`borrower`, `federalTaxNumber`, `cityServiceCode`)
   * são padrão NFE.io e ficam isolados aqui — fora dessa função o resto
   * do código fala "tomador", "cnpj", "código do serviço".
   *
   * **Validar contra sandbox** quando user tiver companyId homologada.
   */
  private buildIssuePayload(input: IssueInvoiceInput): Record<string, unknown> {
    return {
      borrower: this.buildBorrower(input.taker),
      cityServiceCode: input.cityServiceCode,
      federalServiceCode: input.federalServiceCode,
      description: input.serviceDescription,
      // NFE.io aceita BRL decimal — não centavos.
      servicesAmount: input.amountCents / 100,
      // Identificador externo pra correlação. NFE.io tem campo
      // `additionalInformation` que aceita texto livre — usamos pra
      // gravar nosso externalRef e qualquer metadata pertinente.
      additionalInformation: this.buildAdditionalInfo(input),
    };
  }

  private buildBorrower(taker: TakerSnapshot): Record<string, unknown> {
    if (taker.type === "pf") {
      return {
        type: "NaturalPerson",
        name: taker.name,
        email: taker.email,
        federalTaxNumber: Number(taker.cpf),
        ...(taker.address ? { address: this.buildAddress(taker.address) } : {}),
      };
    }
    return {
      type: "LegalEntity",
      name: taker.legalName,
      email: taker.email,
      federalTaxNumber: Number(taker.cnpj),
      ...(taker.municipalRegistration
        ? { municipalTaxNumber: taker.municipalRegistration }
        : {}),
      address: this.buildAddress(taker.address),
    };
  }

  private buildAddress(addr: NonNullable<TakerSnapshot["address"]>): Record<string, unknown> {
    return {
      country: addr.country, // ISO alpha-2 — NFE.io aceita "BRA" ou "BR" — confirmar
      postalCode: addr.postalCode,
      street: addr.street,
      number: addr.number,
      additionalInformation: addr.complement ?? "",
      district: addr.district,
      city: {
        code: addr.cityCode,
        name: addr.cityName,
      },
      state: addr.stateUf,
    };
  }

  private buildAdditionalInfo(input: IssueInvoiceInput): string {
    const parts = [`Ref: ${input.externalRef}`];
    if (input.metadata) {
      for (const [k, v] of Object.entries(input.metadata)) {
        parts.push(`${k}: ${v}`);
      }
    }
    return parts.join(" | ");
  }

  // ─── HTTP plumbing ───────────────────────────────────────────────────

  private async request(
    method: "GET" | "POST" | "DELETE",
    url: string,
    body?: unknown,
  ): Promise<unknown> {
    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers: {
          // NFE.io usa o header Authorization SEM prefixo "Bearer".
          // É só a API key crua. Diferente de Stripe/AbacatePay.
          Authorization: this.apiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (err) {
      throw new InvoiceProviderUpstreamError(
        `falha de rede chamando NFE.io (${(err as Error).message})`,
      );
    }

    // 4xx que não seja 5xx tratamos como rejeição permanente — não retentar.
    if (res.status >= 400 && res.status < 500) {
      const detail = await safeReadErrorMessage(res);
      throw new InvoiceProviderRejectedError(`HTTP ${res.status}: ${detail}`);
    }

    if (!res.ok) {
      const detail = await safeReadErrorMessage(res);
      throw new InvoiceProviderUpstreamError(`HTTP ${res.status}: ${detail}`);
    }

    return (await res.json()) as unknown;
  }

  private parseInvoiceResponse(raw: unknown): InvoiceResponse {
    // NFE.io ora devolve o recurso direto, ora envelopado em `{ message,
    // result }`. Tentamos os dois — passthrough garante que nenhum extra
    // quebra o parse.
    const candidate =
      raw && typeof raw === "object" && "result" in raw
        ? (raw as { result: unknown }).result
        : raw;

    const parsed = invoiceResponseSchema.safeParse(candidate);
    if (!parsed.success) {
      throw new InvoiceProviderUpstreamError(
        `resposta inesperada do NFE.io: ${parsed.error.message}`,
      );
    }
    return parsed.data;
  }
}

async function safeReadErrorMessage(res: Response): Promise<string> {
  try {
    const text = await res.text();
    if (!text) return res.statusText;
    try {
      const parsed = JSON.parse(text) as Record<string, unknown>;
      const candidate =
        (typeof parsed.message === "string" && parsed.message) ||
        (typeof parsed.error === "string" && parsed.error);
      return candidate || text;
    } catch {
      return text;
    }
  } catch {
    return res.statusText;
  }
}

// ─── Singleton + factory ───────────────────────────────────────────────

let cached: NfeIoInvoiceProvider | null = null;

/**
 * Factory singleton. Lança se NFEIO_API_KEY ou NFEIO_COMPANY_ID não
 * estão configurados — caller (composition root) deve ter checado
 * `isInvoicingConfigured()` antes.
 */
export function getNfeIoInvoiceProvider(
  emitter: LucidaEmitterConfig,
): NfeIoInvoiceProvider {
  if (!env.NFEIO_API_KEY) {
    throw new InvoicingNotConfiguredError();
  }
  if (!cached) {
    cached = new NfeIoInvoiceProvider(
      env.NFEIO_API_KEY,
      env.NFEIO_BASE_URL,
      emitter,
    );
  }
  return cached;
}

/**
 * Stub usado quando NFE.io não está configurado. Caller que tentar emitir
 * com isso recebe `InvoicingNotConfiguredError` — ramo administrativo
 * (reemissão manual) trata; pipeline de pagamento ignora silenciosamente
 * antes de chegar aqui.
 */
export class UnavailableInvoiceProvider implements InvoiceProvider {
  async issueInvoice(): Promise<never> {
    throw new InvoicingNotConfiguredError();
  }
  async getInvoice(): Promise<never> {
    throw new InvoicingNotConfiguredError();
  }
}
