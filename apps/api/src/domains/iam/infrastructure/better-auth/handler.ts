import type { RequestHandler } from "express";
import { toNodeHandler } from "better-auth/node";
import type { Auth } from "./auth.js";

export function makeAuthHandler(auth: Auth): RequestHandler {
  return toNodeHandler(auth) as unknown as RequestHandler;
}
