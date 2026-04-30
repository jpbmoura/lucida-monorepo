import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import type { Auth } from "@/domains/iam/infrastructure/better-auth/auth.js";
import { fromNodeHeaders } from "better-auth/node";
import type { CreateTicketFromFormUseCase } from "@/domains/tickets/application/create-ticket-from-form.js";

// Categorias aceitas: 5 originais (/app) + 3 institucionais (/analytics).
// Enum compartilhado entre os dois formulários. A categoria é incluída
// como rodapé no body do ticket pra staff ter contexto sem precisar de
// um campo custom no schema.
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
type Category = (typeof VALID_CATEGORIES)[number];

const CATEGORY_LABEL: Record<Category, string> = {
  duvida: "Dúvida",
  problema: "Problema",
  sugestao: "Sugestão",
  billing: "Cobrança",
  outro: "Outro",
  duvida_admin: "Dúvida administrativa",
  billing_institucional: "Cobrança institucional",
  gestao_professores: "Gestão de professores",
};

const contactSchema = z.object({
  category: z.enum(VALID_CATEGORIES),
  subject: z.string().trim().min(3, "Assunto muito curto.").max(160),
  message: z.string().trim().min(10, "Escreva um pouco mais de contexto.").max(4000),
});

/**
 * Controller do formulário de contato em `/app/ajuda` e `/analytics/ajuda`.
 *
 * Antigamente enviava email pro `SUPPORT_EMAIL`; agora cria ticket no
 * sistema de suporte (origin=`form`). Staff vê todas as solicitações
 * unificadas no Kintal — mesma interface pra emails diretos
 * (suporte@) e formulário.
 */
export class SupportController {
  constructor(
    private readonly createTicketFromForm: CreateTicketFromFormUseCase,
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

      const categoryLabel = CATEGORY_LABEL[parsed.data.category];
      const bodyText = `${parsed.data.message}\n\n— — —\nCategoria: ${categoryLabel}`;

      await this.createTicketFromForm.execute({
        customerEmail: session.user.email,
        customerName: session.user.name ?? null,
        userId: session.user.id,
        subject: parsed.data.subject,
        bodyText,
      });

      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };
}
