import "server-only";
import { apiFetch } from "./api-client";

export type OrgBillingMode =
  | "pool"
  | "per_teacher"
  | "pay_per_use"
  | "unlimited";

export interface ActiveOrganization {
  id: string;
  name: string;
  slug: string;
  /**
   * Role do user logado nessa org. `null` quando o user tem org ativa mas
   * não consegue encontrar o member (estado raro — aceitar como "member"
   * no lado da UI é seguro). Usado pra gate do /analytics (owner/admin).
   */
  myRole: "owner" | "admin" | "member" | null;
  /**
   * Modo de cobrança da org. Dita comportamentos visuais no /app — em
   * "pool" e "pay_per_use" a wallet pessoal não é usada, então escondemos
   * o BalanceWidget. Null quando settings ainda não provisionadas (fallback
   * seguro = trata como não-institucional visualmente).
   */
  billingMode: OrgBillingMode | null;
  // Dados fiscais da org (PJ). Editáveis em /analytics/configuracoes.
  // Quando nulos, billing institucional ainda não foi configurado.
  taxId: string | null;
  legalName: string | null;
  municipalRegistration: string | null;
  addressPostalCode: string | null;
  addressStreet: string | null;
  addressNumber: string | null;
  addressComplement: string | null;
  addressDistrict: string | null;
  addressCityCode: string | null;
  addressCityName: string | null;
  addressStateUf: string | null;
  addressCountry: string | null;
}

/**
 * Info enxuta da org ativa na sessão — consumida pelo shell do /analytics
 * (badge cheio no topbar) e pelo shell do /app (eyebrow discreto "Via ...").
 * Retorna `null` quando o user não é member de nenhuma org ou não chamou
 * `setActive` (caso típico: professor comum no /app).
 */
export async function fetchActiveOrganization(): Promise<ActiveOrganization | null> {
  const res = await apiFetch<{ data: ActiveOrganization | null }>(
    `/v1/analytics/active-organization`,
  );
  return res.data;
}

/**
 * Helper: true quando a instituição paga pela ação do user. Em pool,
 * pay_per_use e unlimited, a wallet pessoal é irrelevante — frontend
 * esconde saldo pessoal e mostra mensagens institucionais.
 *
 * `per_teacher` é misto: wallet pessoal seeded pela org, mas o user
 * ainda enxerga como saldo próprio. Trata como "não paga pela org" pra
 * UI manter compatibilidade com o caso avulso.
 */
export function isOrgPayingForUser(
  billingMode: OrgBillingMode | null | undefined,
): boolean {
  return (
    billingMode === "pool" ||
    billingMode === "pay_per_use" ||
    billingMode === "unlimited"
  );
}

/**
 * Resolve a copy contextual da página /app/billing pro modo institucional
 * ativo. Retorna `null` quando o user é avulso ou quando o modo não
 * altera a wallet pessoal (ex: `per_teacher` ainda mostra saldo próprio).
 */
export interface InstitutionalBillingContext {
  title: string;
  description: string;
  /**
   * `true` quando widgets de wallet pessoal devem sumir (saldo, plano,
   * topup, faturas pessoais). Mantém ledger pra auditoria.
   */
  hidePersonalWallet: boolean;
}

export function getInstitutionalBillingContext(
  orgName: string | null,
  billingMode: OrgBillingMode | null | undefined,
): InstitutionalBillingContext | null {
  if (!billingMode) return null;
  const name = orgName ?? "sua instituição";
  switch (billingMode) {
    case "unlimited":
      return {
        title: `${name} cobre seus créditos sem limite`,
        description:
          "Sua instituição tem acordo de uso ilimitado da Lucida. Você pode gerar provas e usar a IA livremente — não precisa gerenciar créditos pessoais.",
        hidePersonalWallet: true,
      };
    case "pool":
      return {
        title: `${name} cobre seus créditos`,
        description:
          "Suas ações descontam do pool de créditos da sua instituição. Você não precisa de plano nem saldo pessoal — fale com o admin se aparecer aviso de saldo zerado.",
        hidePersonalWallet: true,
      };
    case "pay_per_use":
      return {
        title: `${name} cobre seu uso por consumo`,
        description:
          "Sua instituição é cobrada por fatura mensal proporcional ao consumo. Você usa livremente — sem limite de créditos pessoais.",
        hidePersonalWallet: true,
      };
    case "per_teacher":
      return {
        title: `Cota mensal provida por ${name}`,
        description:
          "Sua cota de créditos é renovada automaticamente pela sua instituição. Use o saldo abaixo como referência.",
        hidePersonalWallet: false,
      };
  }
}
