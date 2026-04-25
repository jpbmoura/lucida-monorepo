export function formatRelativeTime(iso: string | null, fallback = "Sem atividade"): string {
  if (!iso) return fallback;
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return "agora";

  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "ontem";
  if (days < 7) return `há ${days}d`;
  if (days < 30) return `há ${Math.floor(days / 7)}sem`;
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(date);
}

/**
 * Formatação pra datas FUTURAS (expiração de créditos, próxima renovação).
 * Faixas:
 *  - < 1h  → "em alguns minutos"
 *  - < 24h → "em Xh"
 *  - < 30d → "em X dias"
 *  - > 30d → data absoluta "23 de mai"
 * Se a data já passou, devolve "expirada".
 */
export function formatTimeUntil(iso: string | null, fallback = "—"): string {
  if (!iso) return fallback;
  const date = new Date(iso);
  const diffMs = date.getTime() - Date.now();
  if (diffMs <= 0) return "expirada";

  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return "em alguns minutos";
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `em ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "amanhã";
  if (days < 30) return `em ${days} dias`;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: diffMs > 1000 * 60 * 60 * 24 * 300 ? "numeric" : undefined,
  }).format(date);
}
