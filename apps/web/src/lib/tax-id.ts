/**
 * Helpers de CPF/CNPJ. CPF tem 11 dígitos, CNPJ 14. Ambos são tratados
 * como `taxId` no perfil; o formato persistido é só dígitos.
 */

/** Aplica máscara progressiva conforme o user digita. */
export function formatTaxId(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1-$2");
  }
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export function normalizeTaxId(raw: string): string {
  return raw.replace(/\D/g, "");
}

/** Validação puramente sintática (11 ou 14 dígitos). Não checa dígito verificador. */
export function isValidTaxId(raw: string): boolean {
  const digits = normalizeTaxId(raw);
  return digits.length === 11 || digits.length === 14;
}
