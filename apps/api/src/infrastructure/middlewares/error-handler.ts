import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { DomainError } from "@/shared/errors/domain-error.js";
import { env } from "@/env.js";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      code: "VALIDATION_ERROR",
      message: "Invalid request payload",
      issues: err.flatten(),
    });
    return;
  }

  if (err instanceof DomainError) {
    res.status(err.statusCode).json({
      code: err.code,
      message: err.message,
    });
    return;
  }

  // Unhandled — qualquer Error que escapou de um wrapper de domínio.
  // Em dev a gente devolve a causa pra inspeção pelo browser; em prod só
  // o genérico (não vazar stack). O console sempre loga o stack inteiro.
  const e = err as Error & { code?: string; status?: number; type?: string };
  console.error("[api] unhandled error", {
    name: e?.name,
    constructor: err?.constructor?.name,
    code: e?.code,
    status: e?.status,
    type: e?.type,
    message: e?.message,
    stack: e?.stack,
  });

  const isDev = env.NODE_ENV !== "production";
  res.status(500).json({
    code: "INTERNAL_ERROR",
    message: isDev
      ? `Unexpected error: ${e?.constructor?.name ?? "Error"} — ${e?.message ?? "sem mensagem"}`
      : "Unexpected error",
  });
};
