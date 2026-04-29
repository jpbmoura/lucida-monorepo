import { DomainError } from "@/shared/errors/domain-error.js";

/**
 * NFE.io não está configurado no ambiente — falta NFEIO_API_KEY ou
 * NFEIO_COMPANY_ID. Quando o módulo está offline, a emissão de NFS-e é
 * silenciosamente pulada (não devolve erro pra rota de pagamento; o
 * pagamento processa normal). Esse erro é usado em rotas administrativas
 * que tentam reemitir manualmente.
 */
export class InvoicingNotConfiguredError extends DomainError {
  readonly code = "INVOICING_NOT_CONFIGURED";
  readonly statusCode = 503;
  constructor() {
    super("Emissão de notas fiscais ainda não está habilitada neste ambiente.");
  }
}

/**
 * O provider (NFE.io) devolveu erro de rede/5xx ou resposta com formato
 * inesperado. Diferente de "rejeitou": aqui não é problema do payload —
 * é problema externo. Caller normalmente trata como falha transitória e
 * agenda retry.
 */
export class InvoiceProviderUpstreamError extends DomainError {
  readonly code = "INVOICE_PROVIDER_UPSTREAM_ERROR";
  readonly statusCode = 502;
  constructor(detail: string) {
    super(`Falha no provedor de NFS-e: ${detail}`);
  }
}

/**
 * O provider rejeitou a emissão por dado inválido (CPF inválido, endereço
 * incompleto, código de serviço não aceito pelo município, etc). Falha
 * permanente — retry não resolve, precisa corrigir o input. Caller marca
 * a Invoice como `failed` e notifica staff.
 */
export class InvoiceProviderRejectedError extends DomainError {
  readonly code = "INVOICE_PROVIDER_REJECTED";
  readonly statusCode = 422;
  constructor(detail: string) {
    super(`NFS-e rejeitada: ${detail}`);
  }
}

/**
 * O resolver de taker não conseguiu construir o snapshot — dados fiscais
 * incompletos no user/org doc. Diferente de `InvoicingNotConfiguredError`
 * (provider offline): aqui o sistema está ON, só falta o user/org
 * preencher informação. Webhooks tratam como skip + log; staff investiga
 * manualmente.
 */
export class InvoiceTakerMissingError extends DomainError {
  readonly code = "INVOICE_TAKER_MISSING";
  readonly statusCode = 422;
  constructor(
    readonly ownerId: string,
    readonly organizationId: string | null,
  ) {
    super(
      organizationId
        ? `Dados fiscais da organização ${organizationId} estão incompletos.`
        : `Dados fiscais do usuário ${ownerId} estão incompletos.`,
    );
  }
}
