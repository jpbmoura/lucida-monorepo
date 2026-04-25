import type { RequestHandler } from "express";
import { DomainError } from "@/shared/errors/domain-error.js";

class NotStaffError extends DomainError {
  readonly code = "NOT_STAFF";
  readonly statusCode = 403;
  constructor() {
    super("Acesso ao Kintal é restrito à equipe interna da Lucida.");
  }
}

/**
 * Middleware que exige `realUserRole === "staff"`. Use após `requireAuth` —
 * o role já vem decorado no `req.auth` via additionalField da BA, então
 * esta checagem não gasta I/O.
 */
export function makeRequireStaff(): RequestHandler {
  return (req, _res, next) => {
    if (req.auth?.realUserRole !== "staff") {
      return next(new NotStaffError());
    }
    next();
  };
}
