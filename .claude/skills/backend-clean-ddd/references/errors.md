# Errors

Duas categorias:

1. **Domain errors** — regra de negócio violada. Esperado. Vira resposta HTTP 4xx com código estável.
2. **Infra / bugs** — falha técnica (conexão Mongo caiu, bug de código). Vira 500 com stack logada, cliente não vê detalhes.

**Decisão do projeto**: `throw`, não Result/Either. Simplicidade no fluxo feliz, error middleware único faz o mapeamento.

## Base

```ts
// src/shared/domain/domain-error.ts
export abstract class DomainError extends Error {
  abstract readonly code: string;        // estável, consumido por frontend
  abstract readonly statusCode: number;  // 4xx
  readonly details?: Record<string, unknown>;

  constructor(message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.details = details;
  }
}
```

**Por que `code` separado de `message`?** `message` é para humano/log. `code` é para lógica do frontend (`if (err.code === 'EXAM_LOCKED')`). Nunca faça o frontend depender do `message`.

## Status codes padronizados

| Situação | Status | Exemplo de erro |
|---|---|---|
| Recurso não encontrado | 404 | `ExamNotFoundError` |
| Conflito de estado | 409 | `ExamLockedError`, `EmailAlreadyInUseError` |
| Autenticação ausente/inválida | 401 | `UnauthenticatedError` |
| Autenticado, sem permissão | 403 | `ForbiddenError` |
| Regra de negócio violada, input semanticamente válido | 422 | `InvalidExamTitleError`, `InsufficientCreditsError` |
| Input malformado (tipo errado, JSON inválido) | 400 | `ZodError` |
| Rate / quota | 429 | `RateLimitExceededError` |
| Pagamento falhou (card declined) | 402 | `PaymentDeclinedError` |

## Regra: 400 vs 422

- **400** = não entendi seu input. Zod falhou, JSON inválido, content-type errado.
- **422** = entendi, mas viola regra de negócio. Ex: título é string e tem 2 chars (Zod passou com `min(1)`); plano é válido mas conta não tem créditos; email está bem formatado mas já existe.

## Hierarquia por feature

```ts
// domain/errors/exam-errors.ts
import { DomainError } from '@/shared/domain/domain-error';
import { ExamId } from '../value-objects/exam-id';

export class ExamNotFoundError extends DomainError {
  readonly code = 'EXAM_NOT_FOUND';
  readonly statusCode = 404;
  constructor(id: ExamId) {
    super(`Exam not found: ${id.value}`, { examId: id.value });
  }
}

export class ExamLockedError extends DomainError {
  readonly code = 'EXAM_LOCKED';
  readonly statusCode = 409;
  constructor(id: ExamId) {
    super(`Exam is published and cannot be modified`, { examId: id.value });
  }
}

export class InvalidExamTitleError extends DomainError {
  readonly code = 'INVALID_EXAM_TITLE';
  readonly statusCode = 422;
  constructor(raw: string) {
    super(`Invalid exam title`, { raw });
  }
}

export class ExamHasNoQuestionsError extends DomainError {
  readonly code = 'EXAM_HAS_NO_QUESTIONS';
  readonly statusCode = 422;
  constructor(id: ExamId) {
    super(`Cannot publish exam with no questions`, { examId: id.value });
  }
}
```

### Agrupar com classe intermediária (opcional)

```ts
abstract class ExamError extends DomainError {}   // marker

export class ExamNotFoundError extends ExamError { ... }
export class ExamLockedError extends ExamError { ... }
```

Útil se você quiser `catch (err: unknown) { if (err instanceof ExamError) ... }` em algum wrapper. Sem uso concreto, é ruído — só adicione quando precisar.

## Erros comuns compartilhados

```ts
// src/shared/domain/errors/auth-errors.ts
import { DomainError } from '../domain-error';

export class UnauthenticatedError extends DomainError {
  readonly code = 'UNAUTHENTICATED';
  readonly statusCode = 401;
  constructor() { super('Authentication required'); }
}

export class ForbiddenError extends DomainError {
  readonly code = 'FORBIDDEN';
  readonly statusCode = 403;
  constructor(details?: Record<string, unknown>) {
    super('Permission denied', details);
  }
}
```

## Erros de infraestrutura

Exceções de Mongo, timeouts, falhas HTTP — **não** estenda `DomainError`. São erros técnicos; o middleware cai no 500 genérico e o log tem a stack.

Se quiser separar para visibilidade (ex: retornar 503 em vez de 500):

```ts
// src/shared/infrastructure/infrastructure-error.ts
export class InfrastructureError extends Error {
  readonly cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.cause = cause;
  }
}

export class ExternalServiceUnavailableError extends InfrastructureError {}
```

Middleware:

```ts
if (err instanceof ExternalServiceUnavailableError) {
  console.error('[external]', err.message, err.cause);
  res.status(503).json({ code: 'SERVICE_UNAVAILABLE', message: 'Temporary issue, retry later' });
  return;
}
```

Use com moderação — a maioria das falhas técnicas deve cair no 500 genérico e ser investigada no log.

## Erros de integração externa (Stripe, OpenAI…)

- Falha **prevista** (cartão recusado, quota OpenAI excedida) → mapeia para `DomainError` específico **dentro do adapter**:

```ts
// infrastructure/billing/stripe-payment-gateway.ts
export class StripePaymentGateway implements PaymentGateway {
  async charge(req: ChargeRequest) {
    try {
      return await this.stripe.paymentIntents.create({ /* ... */ });
    } catch (err) {
      if (err instanceof Stripe.errors.StripeCardError) {
        throw new PaymentDeclinedError(err.code ?? 'card_declined');
      }
      throw err;   // deixa subir como infra
    }
  }
}
```

- Falha **imprevista** (timeout, 500 da API externa) → deixa propagar; cai no 500.

## Error middleware (cópia aqui para referência rápida)

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

## Anti-patterns

- ❌ `throw new Error('...')` em código de domínio. Sempre subclasse nomeada de `DomainError`.
- ❌ Erro sem `code`. Frontend fica sem como reagir.
- ❌ Retornar `{ success: false, message }` do use case. Mistura fluxo feliz com erro, espalha `if (!result.success)`.
- ❌ `try/catch` no controller para "tratar" erro e virar 400 manualmente. Deixe o middleware.
- ❌ Expor stack trace ou `err.message` cru em 500. Cliente só recebe `INTERNAL_ERROR`.
- ❌ Vazamento de erro do Mongoose (`CastError`, `ValidationError`) para o cliente. Ou o mapper trata antes, ou vira 500.
