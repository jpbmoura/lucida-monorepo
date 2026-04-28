import type { PixTopupIntentRepository } from "../domain/pix-topup-intent-repository.js";
import type { PixTopupIntentStatus } from "../domain/pix-topup-intent.js";
import { PixTopupIntentNotFoundError } from "../domain/billing-errors.js";

interface Input {
  abacateId: string;
  ownerId: string;
}

export interface PixTopupStatusOutput {
  abacateId: string;
  status: PixTopupIntentStatus;
  /** Atualizado em tempo real conforme `expiresAt` passa, mesmo sem webhook. */
  effectiveStatus: PixTopupIntentStatus;
  amountCents: number;
  expiresAt: Date;
  paidAt: Date | null;
}

/**
 * Endpoint que o frontend polla a cada ~3s enquanto o user tem o modal
 * de QR aberto. Lê do nosso Mongo (não bate na AbacatePay) — o webhook
 * `transparent.completed` é quem move pra PAID.
 *
 * Como segurança contra webhook atrasado, calcula `effectiveStatus`:
 * se ainda PENDING mas `expiresAt` já passou, devolve EXPIRED pro front
 * sem mexer no doc (o estado persistido fica como está, e um cron pode
 * limpar depois).
 */
export class GetPixTopupStatusUseCase {
  constructor(private readonly intents: PixTopupIntentRepository) {}

  async execute(input: Input): Promise<PixTopupStatusOutput> {
    const intent = await this.intents.findByAbacateIdAndOwner(
      input.abacateId,
      input.ownerId,
    );
    if (!intent) {
      throw new PixTopupIntentNotFoundError();
    }

    const now = new Date();
    const effectiveStatus =
      intent.status === "PENDING" && intent.expiresAt <= now
        ? "EXPIRED"
        : intent.status;

    return {
      abacateId: intent.abacateId,
      status: intent.status,
      effectiveStatus,
      amountCents: intent.amountCents,
      expiresAt: intent.expiresAt,
      paidAt: intent.paidAt,
    };
  }
}
