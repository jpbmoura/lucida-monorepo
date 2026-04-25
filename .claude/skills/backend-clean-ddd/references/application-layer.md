# Application Layer

Onde os **use cases** vivem. Cada use case = uma operação de negócio (um verbo).

## Regras

- Importa só `domain/` (da própria feature e de `shared/`).
- **Nenhum** `mongoose`, `express`, `zod`, `clerk`.
- Nenhuma lógica de apresentação (formatação HTTP fica no controller).
- Se você precisa de `req`, está no lugar errado.

## Interface `UseCase` em shared

```ts
// src/shared/application/use-case.ts
export interface UseCase<Input, Output> {
  execute(input: Input): Promise<Output>;
}
```

## Template de use case

### DTO

```ts
// application/use-cases/create-exam/create-exam.dto.ts
export interface CreateExamInput {
  ownerId: string;
  title: string;
  durationMinutes: number;
}

export interface CreateExamOutput {
  examId: string;
}
```

### Classe

```ts
// application/use-cases/create-exam/create-exam.use-case.ts
import { UseCase } from '@/shared/application/use-case';
import { ExamRepository } from '@/domains/exam/domain/repositories/exam-repository';
import { Exam } from '@/domains/exam/domain/entities/exam';
import { ExamTitle } from '@/domains/exam/domain/value-objects/exam-title';
import { Duration } from '@/domains/exam/domain/value-objects/duration';
import { CreateExamInput, CreateExamOutput } from './create-exam.dto';

export class CreateExamUseCase implements UseCase<CreateExamInput, CreateExamOutput> {
  constructor(private readonly examRepo: ExamRepository) {}

  async execute(input: CreateExamInput): Promise<CreateExamOutput> {
    const exam = Exam.create({
      title: ExamTitle.create(input.title),
      ownerId: input.ownerId,
      duration: Duration.fromMinutes(input.durationMinutes),
    });

    await this.examRepo.save(exam);

    return { examId: exam.id.value };
  }
}
```

## DTOs vs. entidades

Input/Output de use case são **objetos planos**, nunca entidades. Entidades são detalhes da camada de domínio.

**Por quê**: se o use case retornasse `Exam`, o controller precisaria conhecer os getters da entidade e acabaria com lógica de serialização espalhada. Centralize a projeção no use case.

Saída rica → DTO rico:

```ts
export interface ExamSummary {
  id: string;
  title: string;
  ownerId: string;
  questionCount: number;
  isPublished: boolean;
  publishedAt: string | null;   // ISO string — é DTO, não Date
  createdAt: string;
}
```

Projeção fica no use case:

```ts
async execute(input): Promise<ExamSummary> {
  const exam = await this.examRepo.findById(ExamId.fromString(input.examId));
  if (!exam) throw new ExamNotFoundError(ExamId.fromString(input.examId));

  return {
    id: exam.id.value,
    title: exam.title.value,
    ownerId: exam.ownerId,
    questionCount: exam.questions.length,
    isPublished: exam.isPublished,
    publishedAt: exam.publishedAt?.toISOString() ?? null,
    createdAt: exam.createdAt.toISOString(),
  };
}
```

Se a projeção é usada em 3+ use cases, extraia um mapper de DTO em `application/mappers/` (**não** em `infrastructure/` — isso é projeção de domínio para saída, não persistência).

## Orquestração com múltiplas dependências

Use case pode receber vários ports:

```ts
import { Clock } from '@/shared/application/ports/clock';

export class PublishExamUseCase
  implements UseCase<PublishExamInput, PublishExamOutput>
{
  constructor(
    private readonly examRepo: ExamRepository,
    private readonly clock: Clock,
    private readonly eventBus: EventBus,
  ) {}

  async execute(input: PublishExamInput): Promise<PublishExamOutput> {
    const id = ExamId.fromString(input.examId);
    const exam = await this.examRepo.findById(id);
    if (!exam) throw new ExamNotFoundError(id);

    exam.publish();
    await this.examRepo.save(exam);
    await this.eventBus.publish(new ExamPublishedEvent(exam.id, this.clock.now()));

    return { publishedAt: exam.publishedAt!.toISOString() };
  }
}
```

Ports (`Clock`, `EventBus`, `Logger`) ficam em `src/shared/application/ports/` se genéricos, ou em `domain/ports/` da feature se específicos.

### `Clock` — por que abstrair `new Date()`?

Testes determinísticos. Sem `Clock`, testar "foi publicado hoje" exige mock global de Date. Com `Clock`, você injeta um `FixedClock` no teste.

```ts
// src/shared/application/ports/clock.ts
export interface Clock {
  now(): Date;
}

// src/shared/infrastructure/system-clock.ts
export class SystemClock implements Clock {
  now(): Date { return new Date(); }
}
```

## Transações

Mongo suporta transações em replica sets. Se um use case muta mais de um aggregate, use um port `UnitOfWork`:

```ts
// src/shared/application/ports/unit-of-work.ts
export interface UnitOfWork {
  run<T>(fn: () => Promise<T>): Promise<T>;
}
```

No use case:

```ts
async execute(input) {
  return this.uow.run(async () => {
    const exam = await this.examRepo.findById(id);
    // ...
    await this.examRepo.save(exam);
    await this.otherRepo.save(other);
  });
}
```

Implementação Mongoose em [infrastructure-layer.md](infrastructure-layer.md). **Limitação real**: a session Mongoose não propaga automaticamente — considere se o design não está pedindo um único aggregate maior antes de investir em UoW.

## Um use case, um arquivo, um método público

Anti-pattern:

```ts
// ❌
export class ExamService {
  createExam(...) {}
  publishExam(...) {}
  deleteExam(...) {}
}
```

Correto:

```ts
// ✅
export class CreateExamUseCase { execute(...) }
export class PublishExamUseCase { execute(...) }
export class DeleteExamUseCase { execute(...) }
```

**Benefício**: cada use case declara exatamente as dependências que usa (ex: `Delete` talvez não precise de `EventBus`). Isso ajuda a testar e a raciocinar sobre impacto.

## Anti-patterns

- ❌ Use case chamando outro use case. Em vez disso, extraia a lógica para um domain service ou para um método da entidade.
- ❌ Retornar entidade de use case. Projete em DTO.
- ❌ `if` de autorização dentro do use case (ex: `if (exam.ownerId !== input.userId) throw new ForbiddenError()`). Isso é regra de domínio — crie método na entidade ou domain service (`exam.assertOwnedBy(userId)`). Ok, esse específico tem espaço para debate; o importante é consistência.
- ❌ Use case com `try/catch` só para logar e re-throw. Deixe o middleware cuidar.
