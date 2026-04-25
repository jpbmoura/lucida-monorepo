import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import type { Auth } from "@/domains/iam/infrastructure/better-auth/auth.js";
import { fromNodeHeaders } from "better-auth/node";
import type { SendContactMessageUseCase } from "../application/send-contact-message.js";

// Categorias aceitas: 5 originais (/app) + 3 institucionais (/analytics).
// Enum compartilhado entre os dois formulários — o `referer` do email revela
// a origem real pra quem responde.
const VALID_CATEGORIES = [
  "duvida",
  "problema",
  "sugestao",
  "billing",
  "outro",
  "duvida_admin",
  "billing_institucional",
  "gestao_professores",
] as const;

const contactSchema = z.object({
  category: z.enum(VALID_CATEGORIES),
  subject: z.string().trim().min(3, "Assunto muito curto.").max(160),
  message: z.string().trim().min(10, "Escreva um pouco mais de contexto.").max(4000),
});

export class SupportController {
  constructor(
    private readonly sendContactMessage: SendContactMessageUseCase,
    private readonly auth: Auth,
  ) {}

  send = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = contactSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          code: "INVALID_BODY",
          message: "Dados inválidos no formulário.",
          issues: parsed.error.issues,
        });
        return;
      }

      const session = await this.auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
      });
      if (!session) {
        res.status(401).json({ code: "UNAUTHORIZED", message: "Faça login." });
        return;
      }

      await this.sendContactMessage.execute({
        category: parsed.data.category,
        subject: parsed.data.subject,
        message: parsed.data.message,
        user: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name ?? "",
        },
        metadata: {
          userAgent: pickHeader(req, "user-agent"),
          referer: pickHeader(req, "referer"),
          timestamp: new Date().toISOString(),
          ipHash: null,
        },
      });

      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };
}

function pickHeader(req: Request, name: string): string | null {
  const raw = req.headers[name];
  if (Array.isArray(raw)) return raw[0] ?? null;
  return raw ?? null;
}
