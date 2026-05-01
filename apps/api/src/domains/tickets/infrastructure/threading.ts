/**
 * Helpers de threading de email. Combinamos 2 estratégias pra correlacionar
 * inbound de cliente com ticket existente:
 *
 *  1. Plus addressing (preferido): incluímos no Reply-To a tag do ticket
 *     no formato `local+t_<ticketId>@domain`. Quando cliente responde,
 *     o `to` do email vem com o plus address e a gente extrai o ticketId.
 *     Funciona em ~99% dos clientes de email.
 *
 *  2. Message-ID / In-Reply-To: setamos `Message-ID: <ticket-{id}-{msgId}@domain>`
 *     no envio. Cliente que segue RFC 5322 inclui esse valor no
 *     `In-Reply-To` da resposta. Match no DB pelo providerMessageId.
 *
 * Se nenhum bater, é considerado conversa nova (cria ticket). Não fazemos
 * fallback "por email do cliente" — emails diferentes do mesmo sender são
 * tratados como threads separadas.
 */

const PLUS_ADDR_RE = /\+t_([a-zA-Z0-9-]+)@/;

/**
 * Extrai ticketId de um endereço com plus addressing.
 * `contato+t_abc123@lucidaexam.com` → `"abc123"`
 *
 * Aceita arrays (alguns inbounds vêm com `to` como array) ou string.
 * Retorna null quando nenhum match encontrado.
 */
export function parsePlusAddressing(
  to: string | string[] | undefined | null,
): string | null {
  if (!to) return null;
  const candidates = Array.isArray(to) ? to : [to];
  for (const addr of candidates) {
    if (typeof addr !== "string") continue;
    const match = PLUS_ADDR_RE.exec(addr);
    if (match) return match[1] ?? null;
  }
  return null;
}

/**
 * Monta o `Message-ID` que vai no header da mensagem outbound. Formato
 * compatível com RFC 5322: `<unique@domain>`. Domain é parseado do
 * `TICKETS_FROM_EMAIL` config.
 */
export function buildOutboundMessageId(
  ticketId: string,
  messageId: string,
  domain: string,
): string {
  return `<ticket-${ticketId}-${messageId}@${domain}>`;
}

/**
 * Monta o `Reply-To` com plus addressing. Cliente que respondê-lo cai
 * em `${local}+t_${ticketId}@domain` — webhook pega via parsePlusAddressing.
 */
export function buildReplyTo(
  ticketId: string,
  fromEmail: string,
): string | null {
  const parts = parseEmailAddress(fromEmail);
  if (!parts) return null;
  return `${parts.local}+t_${ticketId}@${parts.domain}`;
}

/**
 * Parseia "Nome <email@domain>" ou "email@domain" → { local, domain, name }.
 * Retorna null se não achar formato de email válido.
 */
export function parseEmailAddress(
  raw: string,
): { local: string; domain: string; name: string | null } | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  // Formato "Name <email>"
  const angleMatch = /^(.*?)<\s*([^>\s]+)\s*>$/.exec(trimmed);
  let name: string | null = null;
  let email = trimmed;
  if (angleMatch) {
    name = (angleMatch[1] ?? "").trim().replace(/^"|"$/g, "") || null;
    email = angleMatch[2] ?? "";
  }
  const at = email.lastIndexOf("@");
  if (at <= 0 || at === email.length - 1) return null;
  return {
    local: email.slice(0, at),
    domain: email.slice(at + 1).toLowerCase(),
    name,
  };
}
