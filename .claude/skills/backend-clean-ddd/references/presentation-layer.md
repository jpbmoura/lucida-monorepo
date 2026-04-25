# Presentation Layer (Express + Zod)

Adaptadores HTTP. Fino, sem regra de negócio.

## Schema Zod (input validation)

Schemas ficam em `presentation/schemas/`, **nunca** em application/domain.

```ts
// presentation/schemas/create-exam.schema.ts
import { z } from 'zod';

export const createExamBodySchema = z.object({
  title: z.string().min(1).max(200),
  durationMinutes: z.number().int().positive().max(600),
});

export type CreateExamBody = z.infer<typeof createExamBodySchema>;
```

```ts
// presentation/schemas/get-exam.schema.ts
import { z } from 'zod';

export const getExamParamsSchema = z.object({
  id: z.string().uuid(),
});

export type GetExamParams = z.infer<typeof getExamParamsSchema>;
```

**Por quê Zod só aqui**: Zod protege a borda HTTP contra input malformado. Regras de domínio (título mínimo, duração válida) são do VO. Pode ter redundância leve (Zod `min(1)`, VO `min(3)`) — é saudável, cada um protege coisa diferente.

## Controller

```ts
// presentation/exam.controller.ts
import { Request, Response } from 'express';
import { CreateExamUseCase } from '../application/use-cases/create-exam/create-exam.use-case';
import { GetExamByIdUseCase } from '../application/use-cases/get-exam-by-id/get-exam-by-id.use-case';
import { ListExamsForUserUseCase } from '../application/use-cases/list-exams-for-user/list-exams-for-user.use-case';
import { createExamBodySchema } from './schemas/create-exam.schema';
import { getExamParamsSchema } from './schemas/get-exam.schema';

export class ExamController {
  constructor(
    private readonly createExam: CreateExamUseCase,
    private readonly getExamById: GetExamByIdUseCase,
    private readonly listForUser: ListExamsForUserUseCase,
  ) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const body = createExamBodySchema.parse(req.body);
    const ownerId = req.auth!.userId;

    const output = await this.createExam.execute({
      ownerId,
      title: body.title,
      durationMinutes: body.durationMinutes,
    });

    res.status(201).json(output);
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const { id } = getExamParamsSchema.parse(req.params);
    const output = await this.getExamById.execute({ examId: id });
    res.status(200).json(output);
  };

  listMine = async (req: Request, res: Response): Promise<void> => {
    const output = await this.listForUser.execute({ ownerId: req.auth!.userId });
    res.status(200).json(output);
  };
}
```

**Regras do controller**:
- Handlers como **arrow functions de campo** para preservar `this` sem `.bind`.
- `parse` (não `safeParse`) — erros Zod caem no error middleware.
- Zero `try/catch` — Express 5 propaga async errors nativamente.
- **Zero lógica**. Qualquer `if` de negócio no controller = mover.
- Controller recebe use cases via construtor. Não importa repos, não importa Mongoose.

## Routes

Rotas exportam **factory function** que recebe controller e middlewares — sem singletons globais.

```ts
// presentation/exam.routes.ts
import { Router } from 'express';
import { ExamController } from './exam.controller';
import { requireAuth } from '@/infrastructure/middlewares/require-auth';

export function makeExamRoutes(controller: ExamController): Router {
  const router = Router();

  router.use(requireAuth);                      // todas as rotas da feature exigem auth
  router.post('/', controller.create);
  router.get('/', controller.listMine);
  router.get('/:id', controller.getById);

  return router;
}
```

## Auth middleware

Se o projeto usa Clerk, o middleware existe. Senão, crie um fino:

```ts
// src/infrastructure/middlewares/require-auth.ts
import { RequestHandler } from 'express';
import { UnauthenticatedError } from '@/shared/domain/errors/auth-errors';

// Augment do Request para tipar req.auth
declare global {
  namespace Express {
    interface Request {
      auth?: { userId: string };
    }
  }
}

export const requireAuth: RequestHandler = (req, _res, next) => {
  if (!req.auth?.userId) throw new UnauthenticatedError();
  next();
};
```

A população de `req.auth` vem de um middleware upstream (Clerk `clerkMiddleware()` ou um JWT parser). `requireAuth` só assegura presença.

## Error middleware (global)

```ts
// src/infrastructure/middlewares/error-handler.ts
import { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { DomainError } from '@/shared/domain/domain-error';

export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) return next(err);

  if (err instanceof ZodError) {
    res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'Invalid request payload',
      issues: err.issues,
    });
    return;
  }

  if (err instanceof DomainError) {
    res.status(err.statusCode).json({
      code: err.code,
      message: err.message,
      details: err.details,
    });
    return;
  }

  console.error('[unhandled]', err);
  res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
};
```

Registrado **por último** no `main.ts`. Ver [errors.md](errors.md).

## Resposta padronizada

Para sucesso, retorne o DTO do use case direto. Não envolva em `{ data: ... }` sem motivo — isso vira padding mental. Se precisar metadados (paginação, cursor), é parte do DTO:

```ts
// DTO do list use case
{
  items: ExamSummary[];
  total: number;
  page: number;
  pageSize: number;
}
```

Controller:

```ts
res.status(200).json(output);
```

## Versionamento

Rotas vão atrás de prefixo `/v1`, `/v2`. No composition root:

```ts
app.use('/v1/exams', makeExamRoutes(examController));
```

Se uma feature vai ganhar `/v2`, duplique `presentation/` (não o domínio): `presentation-v2/exam.controller.ts`. O mesmo use case pode servir ambos — o v2 é tipicamente mudança de contrato HTTP, não de regra.

## Anti-patterns

- ❌ Lógica de domínio no controller (`if (exam.ownerId !== userId)`) — mova para use case ou entidade.
- ❌ Controller instanciando repo/use case direto. Sempre injeção via construtor.
- ❌ `try/catch` no handler. Deixe o middleware.
- ❌ `res.status(200).json({ success: true, data: ... })`. Use o shape natural do DTO.
- ❌ Zod schemas em `application/`. Sobem para `presentation/`.
- ❌ Rotas registradas por side-effect no import. Factory function, sempre.
