# Testing

Foco: entidades e use cases testados em **isolamento** com repo in-memory. Integração (com Mongo real via `mongodb-memory-server`) é opcional e complementar.

Os exemplos assumem `vitest`. Para `jest`, troque `vi` por `jest` — o restante é igual.

## Repo in-memory

Implementa a mesma interface do domínio. Um por aggregate, reutilizável.

```ts
// domains/exam/__tests__/helpers/in-memory-exam-repository.ts
import { ExamRepository } from '../../domain/repositories/exam-repository';
import { Exam } from '../../domain/entities/exam';
import { ExamId } from '../../domain/value-objects/exam-id';

export class InMemoryExamRepository implements ExamRepository {
  items = new Map<string, Exam>();

  async findById(id: ExamId): Promise<Exam | null> {
    return this.items.get(id.value) ?? null;
  }

  async findByOwner(ownerId: string): Promise<Exam[]> {
    return [...this.items.values()].filter(e => e.ownerId === ownerId);
  }

  async save(exam: Exam): Promise<void> {
    this.items.set(exam.id.value, exam);
  }

  async delete(id: ExamId): Promise<void> {
    this.items.delete(id.value);
  }
}
```

**Regra**: o in-memory repo **implementa a interface do domínio**. Se a interface muda, TS avisa imediatamente quando a impl in-memory fica desatualizada. Isso é dobro segurança grátis.

## Testando entidade

Foco em invariantes — o que a entidade **promete** e **proíbe**.

```ts
import { describe, it, expect } from 'vitest';
import { Exam } from '../domain/entities/exam';
import { ExamTitle } from '../domain/value-objects/exam-title';
import { Duration } from '../domain/value-objects/duration';
import { Question } from '../domain/entities/question';
import { ExamLockedError, ExamHasNoQuestionsError } from '../domain/errors/exam-errors';

describe('Exam', () => {
  const makeValidExam = () => Exam.create({
    title: ExamTitle.create('Intro to Calculus'),
    ownerId: 'user_1',
    duration: Duration.fromMinutes(60),
  });

  const makeQuestion = () => Question.create({
    statement: 'What is 2+2?',
    options: ['3', '4', '5'],
    correctOptionIndex: 1,
  });

  it('is not published on creation', () => {
    expect(makeValidExam().isPublished).toBe(false);
  });

  it('rejects publish when no questions', () => {
    const exam = makeValidExam();
    expect(() => exam.publish()).toThrow(ExamHasNoQuestionsError);
  });

  it('blocks rename after publish', () => {
    const exam = makeValidExam();
    exam.addQuestion(makeQuestion());
    exam.publish();

    expect(() => exam.rename(ExamTitle.create('New')))
      .toThrow(ExamLockedError);
  });

  it('is idempotent on publish', () => {
    const exam = makeValidExam();
    exam.addQuestion(makeQuestion());
    exam.publish();
    const first = exam.publishedAt;

    exam.publish();
    expect(exam.publishedAt).toEqual(first);
  });

  it('blocks addQuestion after publish', () => {
    const exam = makeValidExam();
    exam.addQuestion(makeQuestion());
    exam.publish();

    expect(() => exam.addQuestion(makeQuestion()))
      .toThrow(ExamLockedError);
  });
});
```

**Padrão**: fábrica `make*()` no topo do describe para instâncias válidas. Cada teste muta a partir delas. Sem `beforeEach` compartilhando estado global.

## Testando value object

```ts
describe('ExamTitle', () => {
  it('trims whitespace', () => {
    expect(ExamTitle.create('  hello  ').value).toBe('hello');
  });

  it.each([
    ['', 'too short'],
    ['ab', 'too short'],
    ['a'.repeat(200), 'too long'],
  ])('rejects %s (%s)', (raw) => {
    expect(() => ExamTitle.create(raw)).toThrow(InvalidExamTitleError);
  });

  it('compares by value', () => {
    const a = ExamTitle.create('Math');
    const b = ExamTitle.create('Math');
    expect(a.equals(b)).toBe(true);
  });
});
```

## Testando use case

Foco em orquestração: repo certo chamado, erro certo lançado, DTO correto retornado.

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { CreateExamUseCase } from '../application/use-cases/create-exam/create-exam.use-case';
import { InMemoryExamRepository } from './helpers/in-memory-exam-repository';
import { InvalidExamTitleError } from '../domain/errors/exam-errors';

describe('CreateExamUseCase', () => {
  let repo: InMemoryExamRepository;
  let sut: CreateExamUseCase;

  beforeEach(() => {
    repo = new InMemoryExamRepository();
    sut = new CreateExamUseCase(repo);
  });

  it('persists new exam and returns id', async () => {
    const out = await sut.execute({
      ownerId: 'user_1',
      title: 'Sample',
      durationMinutes: 60,
    });

    expect(out.examId).toBeDefined();
    expect(repo.items.size).toBe(1);

    const saved = [...repo.items.values()][0];
    expect(saved.ownerId).toBe('user_1');
    expect(saved.title.value).toBe('Sample');
    expect(saved.duration.minutes).toBe(60);
  });

  it('rejects invalid title', async () => {
    await expect(
      sut.execute({ ownerId: 'u', title: 'x', durationMinutes: 60 })
    ).rejects.toThrow(InvalidExamTitleError);
  });
});
```

## Stubs de ports

Se o use case depende de `Clock`, `EventBus`, etc., crie stubs triviais:

```ts
// __tests__/helpers/fixed-clock.ts
import { Clock } from '@/shared/application/ports/clock';

export class FixedClock implements Clock {
  constructor(private readonly date: Date) {}
  now() { return new Date(this.date); }
}

// __tests__/helpers/capturing-event-bus.ts
import { EventBus, DomainEvent } from '@/shared/application/ports/event-bus';

export class CapturingEventBus implements EventBus {
  published: DomainEvent[] = [];
  async publish(event: DomainEvent) {
    this.published.push(event);
  }
}
```

Uso:

```ts
it('emits ExamPublishedEvent', async () => {
  const clock = new FixedClock(new Date('2026-01-01T00:00:00Z'));
  const eventBus = new CapturingEventBus();
  const sut = new PublishExamUseCase(repo, clock, eventBus);

  // seed
  await repo.save(/* ... */);

  await sut.execute({ examId: 'abc' });

  expect(eventBus.published).toHaveLength(1);
  expect(eventBus.published[0]).toBeInstanceOf(ExamPublishedEvent);
});
```

## Integração (opcional)

Teste de controller → Express → use case → repo Mongoose real via `mongodb-memory-server`. Vive em `test/integration/` (raiz do projeto, não em `__tests__` da feature).

```ts
// test/integration/exam.int.spec.ts
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import supertest from 'supertest';
import { makeApp } from '@/main';   // export testável do bootstrap

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

it('POST /v1/exams creates exam', async () => {
  const app = makeApp();
  const res = await supertest(app)
    .post('/v1/exams')
    .set('Authorization', 'Bearer test-token')
    .send({ title: 'Sample', durationMinutes: 60 });

  expect(res.status).toBe(201);
  expect(res.body.examId).toBeDefined();
});
```

**Valor**: valida schema Mongoose, mapper e wiring HTTP. **Não substitui** unit tests — complementa.

Para isso funcionar, `bootstrap()` em `main.ts` precisa exportar `makeApp()` separado do `app.listen()`:

```ts
export function makeApp() {
  const app = express();
  // ... tudo que monta rotas e middlewares
  return app;
}

if (require.main === module) {
  bootstrap();
}
```

## O que NÃO testar

- **Mappers triviais** (linha-a-linha copiando campos). Se o mapper tem lógica, teste. Senão, os testes de use case cobrem indiretamente.
- **Controllers isolados**. Só chamam o use case. Se o use case tem teste e o Zod schema é simples, duplica trabalho.
- **Schemas Mongoose em si**. A biblioteca não é sua.
- **Getters de entidade**. Se você testa `exam.title` explicitamente, está testando TS.

## Cobertura

Priorize:
1. **Invariantes de entidade** (cada método de mutação).
2. **Regras de VO** (casos limites de validação).
3. **Use cases**: happy path + pelo menos um caminho de erro por use case.
4. **Domain services**: se existirem, eles são código crítico.

Não persiga 100% de cobertura. Persiga cobertura das **regras**.
