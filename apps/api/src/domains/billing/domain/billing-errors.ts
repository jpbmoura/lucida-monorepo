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
