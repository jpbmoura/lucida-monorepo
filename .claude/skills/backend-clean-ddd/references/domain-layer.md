# Domain Layer

**Regra de ouro**: zero imports de libs externas. Se precisar de uuid/crypto, use `node:crypto` (módulo do runtime, ok).

## Base classes (`src/shared/domain/`)

### `entity.ts`

```ts
export abstract class Entity<Id> {
  protected constructor(public readonly id: Id) {}

  equals(other: Entity<Id>): boolean {
    if (other === this) return true;
    if (other.constructor !== this.constructor) return false;
    return JSON.stringify(this.id) === JSON.stringify(other.id);
  }
}
```

### `value-object.ts`

```ts
export abstract class ValueObject<Props extends Record<string, unknown>> {
  protected readonly props: Props;

  protected constructor(props: Props) {
    this.props = Object.freeze({ ...props });
  }

  equals(other: ValueObject<Props>): boolean {
    if (other === this) return true;
    if (other.constructor !== this.constructor) return false;
    return JSON.stringify(this.props) === JSON.stringify(other.props);
  }
}
```

## Value Objects

Regra: imutável, validado em **factory estática**, equals por valor, construtor privado.

### Com regra de validação

```ts
// domain/value-objects/exam-title.ts
import { ValueObject } from '@/shared/domain/value-object';
import { InvalidExamTitleError } from '../errors/exam-errors';

interface ExamTitleProps {
  value: string;
}

export class ExamTitle extends ValueObject<ExamTitleProps> {
  private static readonly MIN = 3;
  private static readonly MAX = 120;

  private constructor(props: ExamTitleProps) {
    super(props);
  }

  static create(raw: string): ExamTitle {
    const trimmed = raw.trim();
    if (trimmed.length < ExamTitle.MIN || trimmed.length > ExamTitle.MAX) {
      throw new InvalidExamTitleError(raw);
    }
    return new ExamTitle({ value: trimmed });
  }

  get value(): string {
    return this.props.value;
  }
}
```

### Id como VO

```ts
// domain/value-objects/exam-id.ts
import { randomUUID } from 'node:crypto';
import { ValueObject } from '@/shared/domain/value-object';

export class ExamId extends ValueObject<{ value: string }> {
  private constructor(value: string) {
    super({ value });
  }
  static create(): ExamId { return new ExamId(randomUUID()); }
  static fromString(value: string): ExamId { return new ExamId(value); }
  get value(): string { return this.props.value; }
  toString(): string { return this.props.value; }
}
```

**Quando usar VO vs. primitivo?** Se o primitivo tem **regra** (tamanho, formato, range) ou **semântica distinta** (`ExamId` ≠ `UserId` mesmo sendo ambos strings), vira VO. Se é literalmente "um número" sem regra, deixe `number`.

## Entidade (aggregate root)

```ts
// domain/entities/exam.ts
import { Entity } from '@/shared/domain/entity';
import { ExamId } from '../value-objects/exam-id';
import { ExamTitle } from '../value-objects/exam-title';
import { Duration } from '../value-objects/duration';
import { Question } from './question';
import { ExamLockedError, ExamHasNoQuestionsError } from '../errors/exam-errors';

interface ExamProps {
  title: ExamTitle;
  ownerId: string;           // Clerk user id — string é ok, sem regra local
  duration: Duration;
  questions: Question[];
  publishedAt: Date | null;
  createdAt: Date;
}

export class Exam extends Entity<ExamId> {
  private constructor(id: ExamId, private props: ExamProps) {
    super(id);
  }

  static create(input: {
    title: ExamTitle;
    ownerId: string;
    duration: Duration;
  }): Exam {
    return new Exam(ExamId.create(), {
      title: input.title,
      ownerId: input.ownerId,
      duration: input.duration,
      questions: [],
      publishedAt: null,
      createdAt: new Date(),
    });
  }

  /** Reidrata do banco. Assume dado consistente; não revalida regras. */
  static restore(id: ExamId, props: ExamProps): Exam {
    return new Exam(id, props);
  }

  // getters — expõem só o necessário, arrays readonly
  get title(): ExamTitle { return this.props.title; }
  get ownerId(): string { return this.props.ownerId; }
  get duration(): Duration { return this.props.duration; }
  get questions(): readonly Question[] { return this.props.questions; }
  get publishedAt(): Date | null { return this.props.publishedAt; }
  get createdAt(): Date { return this.props.createdAt; }
  get isPublished(): boolean { return this.props.publishedAt !== null; }

  // mutações — nomes de negócio, protegem invariantes
  rename(newTitle: ExamTitle): void {
    if (this.isPublished) throw new ExamLockedError(this.id);
    this.props.title = newTitle;
  }

  addQuestion(question: Question): void {
    if (this.isPublished) throw new ExamLockedError(this.id);
    this.props.questions.push(question);
  }

  publish(): void {
    if (this.isPublished) return;                       // idempotente
    if (this.props.questions.length === 0) {
      throw new ExamHasNoQuestionsError(this.id);
    }
    this.props.publishedAt = new Date();
  }

  /** Snapshot para o mapper persistir. Cópia congelada. */
  snapshot(): Readonly<ExamProps> {
    return Object.freeze({ ...this.props });
  }
}
```

**Regras aplicadas**:
- `create()` vs. `restore()` são explícitos — um valida, outro não.
- Mutações são métodos de negócio (`publish`, `rename`), **não** setters.
- Getters retornam `readonly` para arrays (impede mutação externa).
- Invariantes ficam **na entidade**, não no use case.
- `snapshot()` para o mapper serializar sem precisar de getters para cada prop interna.

## Aggregate root vs. entidade filha

`Question` é entidade filha de `Exam`. Repositório é de `Exam`, **não** de `Question`. Para alterar uma questão, chame método no `Exam`:

```ts
// ainda em exam.ts
updateQuestion(
  questionId: QuestionId,
  update: (q: Question) => void,
): void {
  if (this.isPublished) throw new ExamLockedError(this.id);
  const question = this.props.questions.find(q => q.id.equals(questionId));
  if (!question) throw new QuestionNotFoundInExamError(this.id, questionId);
  update(question);
}
```

Alternativa: reconstruir imutável. A versão com mutação é mais direta em TS e combina com Mongoose `$set` no repo.

## Domain Services

Quando uma regra envolve **mais de um aggregate** ou não pertence naturalmente a nenhum, é um domain service. Stateless, injetado como dependência em use cases.

```ts
// domain/services/exam-grading.service.ts
import { Exam } from '../entities/exam';
import { Submission } from '../entities/submission';
import { Score } from '../value-objects/score';

export class ExamGradingService {
  grade(exam: Exam, submission: Submission): Score {
    // regra que precisa conhecer ambos
    let correct = 0;
    for (const answer of submission.answers) {
      const question = exam.questions.find(q => q.id.equals(answer.questionId));
      if (question && question.isCorrect(answer.choice)) correct++;
    }
    return Score.create(correct, exam.questions.length);
  }
}
```

**Regra**: se couber num método de uma das entidades envolvidas, não crie domain service. Eles são o "caso resto".

## Interface de repositório

Vive em `domain/repositories/`. Fala **tipos de domínio**, nunca documentos Mongoose.

```ts
// domain/repositories/exam-repository.ts
import { Exam } from '../entities/exam';
import { ExamId } from '../value-objects/exam-id';

export interface ExamRepository {
  findById(id: ExamId): Promise<Exam | null>;
  findByOwner(ownerId: string): Promise<Exam[]>;
  save(exam: Exam): Promise<void>;     // upsert
  delete(id: ExamId): Promise<void>;
}
```

**Princípio**: adicione métodos apenas quando um use case precisar. Repositório não é CRUD genérico — é a interface que o domínio **usa**.

## Domain errors

Ver [errors.md](errors.md) para detalhes. Resumo:

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

export class InvalidExamTitleError extends DomainError {
  readonly code = 'INVALID_EXAM_TITLE';
  readonly statusCode = 422;
  constructor(raw: string) {
    super(`Invalid exam title`, { raw });
  }
}

export class ExamLockedError extends DomainError {
  readonly code = 'EXAM_LOCKED';
  readonly statusCode = 409;
  constructor(id: ExamId) {
    super(`Exam is published and cannot be modified`, { examId: id.value });
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
