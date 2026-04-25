// Ponto único pras informações de contato da Lucida. Ao atualizar o número ou
// o email aqui, tudo que consome (marketing-footer, /app/ajuda) segue junto.

export const SUPPORT_CONTACTS = {
  email: "contato@lucidaexam.com",
  whatsappNumber: "5515991668848",
  whatsappDisplay: "+55 15 99166-8848",
} as const;

interface BuildWhatsappUrlInput {
  prefilledMessage?: string;
}

export function buildWhatsappUrl({
  prefilledMessage,
}: BuildWhatsappUrlInput = {}): string {
  const base = `https://wa.me/${SUPPORT_CONTACTS.whatsappNumber}`;
  if (!prefilledMessage) return base;
  return `${base}?text=${encodeURIComponent(prefilledMessage)}`;
}

export function buildMailtoUrl(subject?: string): string {
  const base = `mailto:${SUPPORT_CONTACTS.email}`;
  if (!subject) return base;
  return `${base}?subject=${encodeURIComponent(subject)}`;
}

export const MARKETING_WHATSAPP_MESSAGE =
  "Olá, vim pelo site da Lucida e quero saber mais.";

export function buildAppSupportMessage(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    return "Olá! Estou usando o Lucida e preciso de ajuda com ";
  }
  return `Olá! Sou ${trimmed} e estou usando o Lucida — preciso de ajuda com `;
}

/**
 * Mensagem prefilled pro botão WhatsApp no /analytics/ajuda (contexto de
 * administrador institucional). Expõe o nome da org se disponível pra o
 * atendimento já entender o contexto.
 */
export function buildAnalyticsSupportMessage(input: {
  name: string;
  orgName?: string | null;
}): string {
  const trimmed = input.name.trim();
  const org = input.orgName?.trim();
  const who = trimmed
    ? `Sou ${trimmed}${org ? `, administrador(a) da ${org}` : ""}`
    : org
      ? `Sou administrador(a) da ${org}`
      : "Sou administrador(a) de uma instituição";
  return `Olá! ${who} e preciso de ajuda com `;
}
