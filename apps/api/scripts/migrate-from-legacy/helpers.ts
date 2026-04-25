// Helpers compartilhados pelas fases. Todos puros, sem side effects.

import { randomUUID } from "node:crypto";

export interface PhaseCounts {
  processed: number;
  ok: number;
  skipped: number;
  errors: number;
  extra: Record<string, number>;
}

export function newCounts(): PhaseCounts {
  return { processed: 0, ok: 0, skipped: 0, errors: 0, extra: {} };
}

export function bumpExtra(counts: PhaseCounts, key: string, by = 1): void {
  counts.extra[key] = (counts.extra[key] ?? 0) + by;
}

// ────────────────────────────────────────────────────────────────────────────
// IDs
// ────────────────────────────────────────────────────────────────────────────

/** ObjectId ou string → string estável. */
export function legacyIdToString(raw: unknown): string {
  if (raw == null) throw new Error("legacyIdToString: raw id is nullish");
  if (typeof raw === "string") return raw;
  if (typeof (raw as { toHexString?: () => string }).toHexString === "function") {
    return (raw as { toHexString: () => string }).toHexString();
  }
  return String(raw);
}

export function newId(): string {
  return randomUUID();
}

// ────────────────────────────────────────────────────────────────────────────
// Email sintético e nome derivado
// ────────────────────────────────────────────────────────────────────────────

const SYNTHETIC_DOMAIN = "legacy.lucida.invalid";

/**
 * Para users legacy sem email (só username). Determinístico por clerkId →
 * rodar 2x gera o mesmo email, mantendo idempotência.
 */
export function syntheticEmail(
  username: string | null | undefined,
  clerkId: string,
): string {
  const raw = (username ?? "user").toLowerCase();
  const sanitized = raw
    .replace(/[^a-z0-9.-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "user";
  const suffix = clerkId.replace(/[^a-zA-Z0-9]/g, "").slice(-8) || "legacy";
  return `${sanitized}-${suffix}@${SYNTHETIC_DOMAIN}`;
}

export function isSyntheticEmail(email: string): boolean {
  return email.endsWith(`@${SYNTHETIC_DOMAIN}`);
}

export function deriveNameFromEmail(
  email: string,
  fallback = "Usuário",
): string {
  const prefix = email.split("@")[0];
  if (!prefix) return fallback;
  const normalized = prefix.replace(/[^a-zA-Z0-9]/g, " ").trim();
  if (!normalized) return fallback;
  return normalized
    .split(/\s+/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

// ────────────────────────────────────────────────────────────────────────────
// Student code (7 dígitos sequencial por class)
// ────────────────────────────────────────────────────────────────────────────

const CODE_LENGTH = 7;

export function formatStudentCode(n: number): string {
  return String(n).padStart(CODE_LENGTH, "0");
}

export function parseStudentCode(raw: string | undefined): number {
  if (!raw) return 0;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : 0;
}

// ────────────────────────────────────────────────────────────────────────────
// Parser do correctAnswer legacy (any → índice number)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Legacy guardava `correctAnswer` como `any` — podia ser "A"/"B"/..., índice,
 * "verdadeiro"/"falso", etc. Converte pra índice number compatível com o novo
 * schema (que exige number). Devolve null se for impossível interpretar.
 */
export function parseCorrectAnswer(
  raw: unknown,
  type: "multipleChoice" | "trueFalse",
  options: string[],
): number | null {
  if (raw == null) return null;

  if (typeof raw === "number" && Number.isFinite(raw)) {
    if (raw >= 0 && raw < options.length) return raw;
    return null;
  }

  if (typeof raw !== "string") return null;
  const s = raw.trim().toLowerCase();

  if (type === "trueFalse") {
    if (["verdadeiro", "verdadeira", "true", "v", "t", "sim"].includes(s)) {
      return options.length >= 2 ? 0 : null;
    }
    if (["falso", "falsa", "false", "f", "n", "não", "nao"].includes(s)) {
      return options.length >= 2 ? 1 : null;
    }
  }

  if (s.length === 1 && /[a-e]/.test(s)) {
    const idx = s.charCodeAt(0) - "a".charCodeAt(0);
    return idx < options.length ? idx : null;
  }

  const n = parseInt(s, 10);
  if (Number.isFinite(n) && n >= 0 && n < options.length) return n;

  return null;
}

// ────────────────────────────────────────────────────────────────────────────
// Misc
// ────────────────────────────────────────────────────────────────────────────

export function nowish(): Date {
  return new Date();
}

export function coerceString(v: unknown, fallback = ""): string {
  if (typeof v === "string") return v;
  if (v == null) return fallback;
  return String(v);
}

export function coerceNumber(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

export function coerceDate(v: unknown, fallback?: Date): Date {
  if (v instanceof Date) return v;
  if (typeof v === "string" || typeof v === "number") {
    const d = new Date(v);
    if (!isNaN(d.getTime())) return d;
  }
  return fallback ?? new Date();
}
