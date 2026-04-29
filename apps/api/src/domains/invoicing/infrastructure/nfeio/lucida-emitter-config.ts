import { env } from "@/env.js";

/**
 * Config da Company da Lucida no NFE.io. Os dados fiscais (CNPJ, razão
 * social, endereço, certificado A1) ficam no recurso `Company` do lado do
 * NFE.io — esse arquivo só carrega o `companyId` e os códigos de serviço
 * que viram payload em cada nota emitida.
 *
 * **TODO contábil:** confirmar com contador antes de produção:
 *  - `federalServiceCode` está como "1.05" (Licenciamento ou cessão de
 *    direito de uso de programas de computação, LC 116/03). Pode ser 1.03
 *    (processamento/hospedagem) dependendo da interpretação do município
 *    de Sorocaba.
 *  - `cityServiceCode` é específico da prefeitura de Sorocaba — precisa
 *    bater com o código que a prefeitura emite via DECA. Placeholder
 *    abaixo deve ser substituído.
 *  - `defaultIssRate` é a alíquota efetiva pro Simples Nacional no
 *    município. No Simples a nota indica "ISS recolhido pelo prestador" e
 *    a guia DAS já cobre o ISS.
 */

export interface LucidaEmitterConfig {
  /** ID da Company no NFE.io. Vindo de NFEIO_COMPANY_ID. */
  companyId: string;
  /** Código LC 116/03 — usado em `federalServiceCode` no payload NFE.io. */
  federalServiceCode: string;
  /** Código municipal de Sorocaba pra esse serviço — precisa validar. */
  cityServiceCode: string;
  /** Alíquota ISS em decimal (0.05 = 5%). */
  defaultIssRate: number;
  /** Texto descrição padrão na nota (concatenado com detalhes da transação). */
  serviceDescriptionPrefix: string;
}

const SERVICE_CONSTANTS = {
  // LC 116/03 item 1.05 — licenciamento de software. Validar com contador.
  federalServiceCode: "1.05",
  // Placeholder — substituir pelo código real da prefeitura de Sorocaba.
  cityServiceCode: "010501",
  defaultIssRate: 0.05,
  serviceDescriptionPrefix: "Licenciamento de uso da plataforma Lucida",
} as const;

export function getLucidaEmitterConfig(): LucidaEmitterConfig | null {
  if (!env.NFEIO_COMPANY_ID) return null;
  return {
    companyId: env.NFEIO_COMPANY_ID,
    federalServiceCode: SERVICE_CONSTANTS.federalServiceCode,
    cityServiceCode: SERVICE_CONSTANTS.cityServiceCode,
    defaultIssRate: SERVICE_CONSTANTS.defaultIssRate,
    serviceDescriptionPrefix: SERVICE_CONSTANTS.serviceDescriptionPrefix,
  };
}

export function isInvoicingConfigured(): boolean {
  return Boolean(env.NFEIO_API_KEY && env.NFEIO_COMPANY_ID);
}
