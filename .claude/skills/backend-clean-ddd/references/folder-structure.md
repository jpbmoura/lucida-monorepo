# Estrutura de pastas

## Raiz do backend

```
src/
  domains/
    <feature>/
      domain/
      application/
      infrastructure/
      presentation/
  shared/              ← kernel comum (base Entity, base DomainError, tipos compartilhados)
  infrastructure/      ← conexão com Mongo, middlewares globais, setup do servidor
  main.ts              ← composition root + app.listen
```

## Dentro de uma feature (`src/domains/exam/`)

```
domain/
  entities/
    exam.ts                      ← classe Exam (aggregate root)
    question.ts                  ← classe Question (entity filha)
  value-objects/
    exam-id.ts
    exam-title.ts
    duration.ts
  repositories/
    exam-repository.ts           ← interface apenas
  services/
    exam-grading.service.ts      ← domain service quando regra não cabe em uma entity
  errors/
    exam-errors.ts               ← ExamNotFoundError, InvalidExamTitleError etc.

application/
  use-cases/
    create-exam/
      create-exam.use-case.ts
      create-exam.dto.ts         ← Input/Output types (plain TS, não Zod)
    get-exam-by-id/
      get-exam-by-id.use-case.ts
      get-exam-by-id.dto.ts
    list-exams-for-user/
      list-exams-for-user.use-case.ts
      list-exams-for-user.dto.ts

infrastructure/
  persistence/
    exam.schema.ts               ← schema Mongoose + model
    mongoose-exam.repository.ts  ← implementa ExamRepository
    exam.mapper.ts               ← toDomain / toPersistence

presentation/
  schemas/
    create-exam.schema.ts        ← Zod schemas de input
    get-exam.schema.ts
  exam.controller.ts
  exam.routes.ts                 ← exporta factory que retorna Router

__tests__/
  entities/exam.spec.ts
  use-cases/create-exam.use-case.spec.ts
  helpers/in-memory-exam-repository.ts
```

## Convenções de nome

| Tipo | Arquivo | Export |
|---|---|---|
| Entidade | `exam.ts` | `class Exam` |
| Value Object | `exam-id.ts` | `class ExamId` |
| Interface repositório | `exam-repository.ts` | `interface ExamRepository` (sem `I`) |
| Implementação repo | `mongoose-exam.repository.ts` | `class MongooseExamRepository` |
| Use case | `create-exam.use-case.ts` | `class CreateExamUseCase` |
| DTO | `create-exam.dto.ts` | `type CreateExamInput`, `type CreateExamOutput` |
| Mapper | `exam.mapper.ts` | `class ExamMapper` (métodos estáticos) |
| Controller | `exam.controller.ts` | `class ExamController` |
| Rotas | `exam.routes.ts` | `export function makeExamRoutes(deps): Router` |
| Erro | `exam-errors.ts` | `class ExamNotFoundError extends DomainError` |
| Schema Zod | `create-exam.schema.ts` | `const createExamBodySchema = z.object(...)` |
| Schema Mongoose | `exam.schema.ts` | `const ExamModel = model(...)` |

**Regras de nomeação**:
- Arquivos em `kebab-case`. Sufixo explícito (`.use-case.ts`, `.repository.ts`, `.controller.ts`, `.schema.ts`, `.mapper.ts`, `.dto.ts`, `.spec.ts`).
- Classes em `PascalCase`, iguais ao nome do arquivo sem hífens.
- Interfaces **sem** prefixo `I`. `ExamRepository` é interface; `MongooseExamRepository` é a impl.
- Pastas de conceito de domínio no singular (`exam/`, não `exams/`). Pastas container no plural (`use-cases/`, `value-objects/`).

## shared/ (kernel)

```
src/shared/
  domain/
    entity.ts          ← abstract class Entity<Id>
    value-object.ts    ← abstract class ValueObject<Props>
    domain-error.ts    ← abstract class DomainError
  application/
    use-case.ts        ← interface UseCase<Input, Output>
    ports/
      clock.ts         ← interface Clock (para testabilidade)
      logger.ts        ← interface Logger (opcional)
      unit-of-work.ts  ← interface UnitOfWork (se precisar transação)
```

Regra: **se só uma feature usa, não é shared**. Promova para shared apenas depois da segunda feature precisar.

## Path alias

Configure `tsconfig.json`:

```json
{
  "compilerOptions": {
    "baseUrl": "./",
    "paths": { "@/*": ["src/*"] }
  }
}
```

Todo import absoluto usa `@/`. Imports relativos só dentro da mesma feature (e mesmo assim, curtos).
