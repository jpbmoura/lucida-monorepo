import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { DomainError } from "@/shared/errors/domain-error.js";

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

  console.error("[api] unhandled error", err);
  res.status(500).json({
    code: "INTERNAL_ERROR",
    message: "Unexpected error",
  });
};
