import type { TakerSnapshot } from "./taker-snapshot.js";
export type { TakerSnapshot, TakerSnapshotPF, TakerSnapshotPJ, TakerAddress } from "./taker-snapshot.js";

/**
 * Interface entre nosso domínio e o provedor externo de NFS-e.
 *
 * Implementação concreta hoje é NFE.io (em
 * `infrastructure/nfeio/nfeio-invoice-provider.ts`). Trocar de provedor é
 * trocar essa implementação — `domain` e `application` ficam intocados.
 *
 * Tipos abaixo são propositalmente neutros (não usam vocabulário do NFE.io
 * tipo `borrower` ou `flowStatus`). Tradução pra/do formato do provedor
 * acontece dentro da implementação.
 */

export interface InvoiceProvider {
  /**
   * Cria a nota fiscal no provedor. NFE.io enfileira e processa
   * assincronamente — a resposta vem com status `processing` e os links
   * `pdfUrl`/`xmlUrl` chegam depois (via webhook ou polling).
   *
   * Idempotência: o provider deduplica pelo `externalRef` se ele já
   * tiver sido usado antes pelo mesmo `companyId`. Mesmo assim, o caller
   * (`IssueInvoiceUseCase`) tem unique index local em `externalRef` pra
   * não nem chamar o provider duas vezes.
   */
  issueInvoice(input: IssueInvoiceInput): Promise<ProviderInvoiceResult>;

  /**
   * Lê o estado atual da nota no provedor. Usado pelo worker pra
   * sincronizar status quando o webhook não chegou (rede caiu, secret
   * mudou, etc). Não substitui o webhook — complementa.
   */
  getInvoice(providerInvoiceId: string): Promise<ProviderInvoiceResult>;
}

// ─── Inputs ──────────────────────────────────────────────────────────────

export interface IssueInvoiceInput {
  /**
   * Referência externa única que correlaciona a nota com a transação que
   * gerou ela. Hoje:
   *   - subscription:    `stripe:invoice:{invoice_id}`
   *   - topup Stripe:    `stripe:session:{session_id}`
   *   - topup PIX:       `abacate:{abacateId}`
   *
   * Garante idempotência: webhook entregue 2x → mesmo `externalRef` →
   * provider deduplica e a gente não emite duas notas pro mesmo pagamento.
   */
  externalRef: string;

  /** Snapshot dos dados fiscais do tomador no momento da emissão. */
  taker: TakerSnapshot;

  /** Texto livre que aparece no campo "Discriminação do Serviço" da nota. */
  serviceDescription: string;

  /** Código do serviço LC 116/03 (ex: "1.05" pra licenciamento de software). */
  federalServiceCode: string;

  /**
   * Código do serviço **municipal** — varia por prefeitura. Sorocaba/SP
   * tem códigos próprios; o NFE.io exige esse campo. Vai ser carregado
   * da config do emitter (não muda por nota).
   */
  cityServiceCode: string;

  /** Valor total do serviço em centavos. Provider recebe BRL decimal. */
  amountCents: number;

  /** Metadata opcional repassada ao provider pra debugging. */
  metadata?: Record<string, string>;
}

// ─── Outputs ─────────────────────────────────────────────────────────────

export type ProviderInvoiceStatus =
  | "pending" // ainda não foi enviada pra prefeitura (NFE.io enfileirou)
  | "processing" // enviada, aguardando retorno
  | "issued" // autorizada pela prefeitura
  | "failed" // rejeição permanente
  | "cancelled";

/**
 * Estado da nota no provedor — retornado tanto por `issueInvoice` quanto
 * por `getInvoice`. Os dois métodos olham pro mesmo recurso (a nota), só
 * que `issueInvoice` cria + lê e `getInvoice` só lê.
 *
 * `pdfUrl`/`xmlUrl`/`rpsNumber`/`rpsSeries` são null enquanto a prefeitura
 * não autoriza. `errorMessage` só vem populado quando status = failed.
 */
export interface ProviderInvoiceResult {
  /** ID interno do provider — guardar pra consultar status / cancelar. */
  providerInvoiceId: string;
  /** Status no momento da resposta. */
  status: ProviderInvoiceStatus;
  /** Status cru do provider — guardar pra debug. */
  providerStatusRaw: string;
  /** URLs do PDF/XML — null enquanto não emitida. */
  pdfUrl: string | null;
  xmlUrl: string | null;
  /** Número/série do RPS — preenchidos quando a nota é autorizada. */
  rpsNumber: string | null;
  rpsSeries: string | null;
  /** Mensagem de erro quando status = failed. */
  errorMessage: string | null;
}
