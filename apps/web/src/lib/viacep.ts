/**
 * Consulta CEP via ViaCEP (api pública, gratuita, sem auth).
 * Retorna null em qualquer falha — caller decide se mostra erro pro user
 * ou só deixa preencher manualmente.
 */

export interface ViaCepResult {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  /** Código IBGE de 7 dígitos — exigido pelo NFE.io no `address.city.code`. */
  ibge: string;
}

export async function lookupCep(cep: string): Promise<ViaCepResult | null> {
  const digits = cep.replace(/\D/g, "");
  if (digits.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    if (!res.ok) return null;
    const data = (await res.json()) as { erro?: boolean } & Partial<ViaCepResult>;
    if (data.erro) return null;
    // ViaCEP às vezes devolve campo vazio em vez de erro pra CEPs muito
    // novos; tratamos como ausência de dados.
    if (!data.logradouro && !data.bairro && !data.localidade) return null;
    return {
      cep: data.cep ?? digits,
      logradouro: data.logradouro ?? "",
      complemento: data.complemento ?? "",
      bairro: data.bairro ?? "",
      localidade: data.localidade ?? "",
      uf: data.uf ?? "",
      ibge: data.ibge ?? "",
    };
  } catch {
    return null;
  }
}

/** Máscara progressiva: 12345-678. */
export function formatCep(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}
