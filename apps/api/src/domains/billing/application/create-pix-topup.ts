import { getTopup, type TopupId } from "../domain/topup.js";
import type { PixTopupIntentRepository } from "../domain/pix-topup-intent-repository.js";
import { PixTopupIntent } from "../domain/pix-topup-intent.js";
import { TaxIdRequiredError } from "../domain/billing-errors.js";
import type { AbacatePayClient } from "../infrastructure/abacatepay/abacatepay-client.js";

interface Input {
  ownerId: string;
  ownerEmail: string;
  ownerName: string | null;
  /** Já normalizado (só dígitos) — validar antes na presentation. */
  taxId: string;
  topupId: TopupId;
}

export interface CreatePixTopupOutput {
  abacateId: string;
  brCode: string;
  brCodeBase64: string;
  expiresAt: Date;
  amountCents: number;
}

/**
 * Cria uma cobrança PIX na AbacatePay, salva um espelho local
 * (`PixTopupIntent`) e devolve o QR code pra UI exibir.
 *
 * O depósito da topup wallet só acontece quando o webhook
 * `transparent.completed` chega — esse use case NÃO toca em ledger.
 *
 * Janela de pagamento: 30 minutos. Se o user não pagar a tempo, o
 * frontend mostra "expirado" e oferece gerar um novo.
 */
const PIX_EXPIRES_IN_SECONDS = 30 * 60;

export class CreatePixTopupUseCase {
  constructor(
    private readonly client: AbacatePayClient,
    private readonly intents: PixTopupIntentRepository,
  ) {}

  async execute(input: Input): Promise<CreatePixTopupOutput> {
    if (!input.taxId || !/^\d{11}$|^\d{14}$/.test(input.taxId)) {
      // Defesa em profundidade: presentation deveria ter barrado, mas
      // garantimos aqui pra um caller direto não conseguir burlar.
      throw new TaxIdRequiredError();
    }

    const topup = getTopup(input.topupId);

    const created = await this.client.createPixQrCode({
      amountCents: topup.priceCents,
      description: `Lucida — ${topup.name} (${topup.credits.toLocaleString(
        "pt-BR",
      )} créditos)`,
      expiresInSeconds: PIX_EXPIRES_IN_SECONDS,
      customer: {
        name: input.ownerName ?? input.ownerEmail,
        email: input.ownerEmail,
        taxId: input.taxId,
      },
      // Reconcilia o webhook → wallet. Idealmente usaríamos esse metadata
      // no handler, mas a doc do v2 ainda não confirma se o webhook ecoa
      // metadata custom. Por isso o handler também busca pelo `_id`/abacateId.
      metadata: {
        ownerId: input.ownerId,
        topupId: input.topupId,
      },
    });

    const intent = PixTopupIntent.create({
      abacateId: created.id,
      ownerId: input.ownerId,
      topupId: input.topupId,
      amountCents: created.amountCents,
      taxId: input.taxId,
      brCode: created.brCode,
      brCodeBase64: created.brCodeBase64,
      expiresAt: created.expiresAt,
    });
    await this.intents.save(intent);

    return {
      abacateId: created.id,
      brCode: created.brCode,
      brCodeBase64: created.brCodeBase64,
      expiresAt: created.expiresAt,
      amountCents: created.amountCents,
    };
  }
}
