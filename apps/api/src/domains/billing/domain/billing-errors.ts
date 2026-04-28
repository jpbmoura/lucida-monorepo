import { DomainError } from "@/shared/errors/domain-error.js";

/**
 * Saldo do usuário é insuficiente pra fazer a ação com IA.
 * Status 402 (Payment Required) é o padrão HTTP pra isso.
 */
export class InsufficientCreditsError extends DomainError {
  readonly code = "INSUFFICIENT_CREDITS";
  readonly statusCode = 402;
  constructor(
    readonly required: number,
    readonly available: number,
  ) {
    super(
      `Saldo insuficiente: precisa de ${required} créditos, tem ${available}.`,
    );
  }
}

/**
 * Saldo da **instituição** é insuficiente. Disparado quando o professor
 * está em modo pool e a wallet da org não cobre a ação. Distinto do erro
 * pessoal pra que o frontend mostre mensagem específica ("fale com o
 * administrador da instituição") em vez de oferecer topup individual.
 */
export class InstitutionOutOfCreditsError extends DomainError {
  readonly code = "INSTITUTION_OUT_OF_CREDITS";
  readonly statusCode = 402;
  constructor(
    readonly required: number,
    readonly available: number,
  ) {
    super(
      `A instituição não tem créditos suficientes (precisa ${required}, tem ${available}).`,
    );
  }
}

export class WalletNotFoundError extends DomainError {
  readonly code = "WALLET_NOT_FOUND";
  readonly statusCode = 404;
  constructor() {
    super("Carteira não encontrada.");
  }
}

export class InvalidCreditAmountError extends DomainError {
  readonly code = "INVALID_CREDIT_AMOUNT";
  readonly statusCode = 400;
  constructor(reason: string) {
    super(reason);
  }
}

/**
 * Disparado quando o user tenta iniciar um checkout (Stripe ou AbacatePay)
 * sem ter CPF/CNPJ cadastrado. AbacatePay exige `taxId` no customer pra
 * gerar PIX, e a gente espelha essa exigência no Stripe pra padronizar a
 * coleta. O front gateia: se a session vem sem taxId, abre modal de coleta
 * antes de chamar checkout. Se mesmo assim chegar aqui, devolve 422.
 */
export class TaxIdRequiredError extends DomainError {
  readonly code = "TAX_ID_REQUIRED";
  readonly statusCode = 422;
  constructor() {
    super("Cadastre seu CPF ou CNPJ antes de iniciar o pagamento.");
  }
}

/**
 * AbacatePay não está configurado no ambiente. Espelha
 * StripeNotConfiguredError do controller — sem ABACATEPAY_API_KEY a rota
 * de PIX devolve 503.
 */
export class AbacatePayNotConfiguredError extends DomainError {
  readonly code = "ABACATEPAY_NOT_CONFIGURED";
  readonly statusCode = 503;
  constructor() {
    super("Pagamentos via PIX ainda não estão habilitados neste ambiente.");
  }
}

/**
 * AbacatePay rejeitou a criação do PIX. Mensagem chega do upstream.
 * 502 (Bad Gateway) porque a falha é externa, não input do user.
 */
export class AbacatePayUpstreamError extends DomainError {
  readonly code = "ABACATEPAY_UPSTREAM_ERROR";
  readonly statusCode = 502;
  constructor(detail: string) {
    super(`Falha ao criar pagamento PIX: ${detail}`);
  }
}

/**
 * Tentativa de consultar um pix intent que não existe / não pertence ao
 * usuário autenticado. 404 (esconde existência).
 */
export class PixTopupIntentNotFoundError extends DomainError {
  readonly code = "PIX_TOPUP_INTENT_NOT_FOUND";
  readonly statusCode = 404;
  constructor() {
    super("Cobrança PIX não encontrada.");
  }
}
