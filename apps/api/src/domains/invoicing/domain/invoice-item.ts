/**
 * Item de serviço da nota. Em geral cada Invoice tem 1 item — SaaS
 * fatura licenciamento de uso, sem composição. Mantemos como array
 * pra permitir composição futura (ex: assinatura + crédito incluso
 * em pacote misto) sem quebrar schema.
 */
export interface InvoiceItem {
  /** Texto livre que vira a "Discriminação" da nota. */
  description: string;
  /** Em centavos. Soma dos items === Invoice.amountCents. */
  amountCents: number;
  /** Item LC 116/03 — ex: "1.05" pra licenciamento de software. */
  federalServiceCode: string;
  /** Código municipal — varia por prefeitura. Hoje vem do emitter config. */
  cityServiceCode: string;
}
