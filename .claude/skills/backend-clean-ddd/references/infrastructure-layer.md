# Infrastructure Layer

Detalhes técnicos: Mongoose, clientes HTTP externos, filas, cache. Implementa interfaces declaradas em `domain/`.

## Mongoose schema

```ts
// infrastructure/persistence/exam.schema.ts
import { Schema, model, InferSchemaType } from 'mongoose';

const questionSubSchema = new Schema({
  _id: { type: String, required: true },
  statement: { type: String, required: true },
  options: { type: [String], default: [] },
  correctOptionIndex: { type: Number, required: true },
}, { _id: false });

const examSchema = new Schema({
  _id: { type: String, required: true },   // UUID do VO, não ObjectId
  title: { type: String, required: true },
  ownerId: { type: String, required: true, index: true },
  durationMinutes: { type: Number, required: true },
  questions: { type: [questionSubSchema], default: [] },
  publishedAt: { type: Date, default: null },
  createdAt: { type: Date, required: true },
}, {
  collection: 'exams',
  versionKey: false,
  timestamps: false,     // createdAt vem do domínio
});

export type ExamDoc = InferSchemaType<typeof examSchema> & { _id: string };
export const ExamModel = model<ExamDoc>('Exam', examSchema);
```

**Por que `_id: string` e não ObjectId?** Porque `ExamId` é um VO controlado pelo domínio (UUID). Deixar o Mongoose gerar `ObjectId` acopla o id à infra e quebra a encapsulação do VO. UUID v4 é gerado em `ExamId.create()`.

**Por que `timestamps: false`?** Entidade controla `createdAt` no `Exam.create()`. Dois lugares gerando timestamp = divergência eventual.

**Por que `versionKey: false`?** Use optimistic locking só quando for realmente precisar. Se precisar, configure `versionKey: '__v'` e trate conflito no repo.

## Mapper

```ts
// infrastructure/persistence/exam.mapper.ts
import { Exam } from '@/domains/exam/domain/entities/exam';
import { ExamId } from '@/domains/exam/domain/value-objects/exam-id';
import { ExamTitle } from '@/domains/exam/domain/value-objects/exam-title';
import { Duration } from '@/domains/exam/domain/value-objects/duration';
import { Question } from '@/domains/exam/domain/entities/question';
import { QuestionId } from '@/domains/exam/domain/value-objects/question-id';
import { ExamDoc } from './exam.schema';

export class ExamMapper {
  static toDomain(doc: ExamDoc): Exam {
    const questions = doc.questions.map(q =>
      Question.restore(QuestionId.fromString(q._id), {
        statement: q.statement,
        options: q.options,
        correctOptionIndex: q.correctOptionIndex,
      }),
    );

    return Exam.restore(ExamId.fromString(doc._id), {
      title: ExamTitle.create(doc.title),       // valida; aceitável pois dado deve estar consistente
      ownerId: doc.ownerId,
      duration: Duration.fromMinutes(doc.durationMinutes),
      questions,
      publishedAt: doc.publishedAt,
      createdAt: doc.createdAt,
    });
  }

  static toPersistence(exam: Exam): ExamDoc {
    const snap = exam.snapshot();
    return {
      _id: exam.id.value,
      title: snap.title.value,
      ownerId: snap.ownerId,
      durationMinutes: snap.duration.minutes,
      questions: snap.questions.map(q => ({
        _id: q.id.value,
        statement: q.statement,
        options: [...q.options],
        correctOptionIndex: q.correctOptionIndex,
      })),
      publishedAt: snap.publishedAt,
      createdAt: snap.createdAt,
    };
  }
}
```

**Decisão**: `restore()` **não revalida** regras de negócio. Assume que o banco tem dado consistente (você validou ao salvar). Drift de schema é problema de migration, não validação em cada leitura.

**Exceção pragmática acima**: `ExamTitle.create()` no mapper revalida. Se performance importar (hot path), troque por `ExamTitle.restore()` sem validação. Por padrão valide — pega corrupção cedo.

## Repository implementation

```ts
// infrastructure/persistence/mongoose-exam.repository.ts
import { ExamRepository } from '@/domains/exam/domain/repositories/exam-repository';
import { Exam } from '@/domains/exam/domain/entities/exam';
import { ExamId } from '@/domains/exam/domain/value-objects/exam-id';
import { ExamModel, ExamDoc } from './exam.schema';
import { ExamMapper } from './exam.mapper';

export class MongooseExamRepository implements ExamRepository {
  async findById(id: ExamId): Promise<Exam | null> {
    const doc = await ExamModel.findById(id.value).lean<ExamDoc>().exec();
    return doc ? ExamMapper.toDomain(doc) : null;
  }

  async findByOwner(ownerId: string): Promise<Exam[]> {
    const docs = await ExamModel.find({ ownerId }).lean<ExamDoc[]>().exec();
    return docs.map(ExamMapper.toDomain);
  }

  async save(exam: Exam): Promise<void> {
    const doc = ExamMapper.toPersistence(exam);
    await ExamModel.updateOne(
      { _id: doc._id },
      { $set: doc },
      { upsert: true },
    ).exec();
  }

  async delete(id: ExamId): Promise<void> {
    await ExamModel.deleteOne({ _id: id.value }).exec();
  }
}
```

Notas:
- `.lean()` sempre em leitura — retorna objeto plano, mais rápido, e força passar pelo mapper.
- `save()` é upsert por id. Não diferencie "create" de "update" no repo — o use case decide qual entidade passar.
- **Não exponha** métodos genéricos tipo `findAll()` sem filtro. Paginação cedo, sempre.

## Paginação

Se precisar listar muitos registros, o tipo de retorno não é `Exam[]` — é `PagedResult<Exam>`:

```ts
// src/shared/domain/paged-result.ts
export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
```

Método no repo:

```ts
findPageByOwner(
  ownerId: string,
  page: number,
  pageSize: number,
): Promise<PagedResult<Exam>>;
```

Implementação:

```ts
async findPageByOwner(ownerId: string, page: number, pageSize: number) {
  const [docs, total] = await Promise.all([
    ExamModel.find({ ownerId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean<ExamDoc[]>()
      .exec(),
    ExamModel.countDocuments({ ownerId }).exec(),
  ]);
  return {
    items: docs.map(ExamMapper.toDomain),
    total,
    page,
    pageSize,
  };
}
```

Para paginação em coleções grandes, prefira **keyset** (cursor baseado em `createdAt + _id`) a `skip/limit`.

## Unit of Work (transações)

```ts
// src/infrastructure/persistence/mongoose-unit-of-work.ts
import { UnitOfWork } from '@/shared/application/ports/unit-of-work';
import mongoose from 'mongoose';

export class MongooseUnitOfWork implements UnitOfWork {
  async run<T>(fn: () => Promise<T>): Promise<T> {
    const session = await mongoose.startSession();
    try {
      let result!: T;
      await session.withTransaction(async () => {
        result = await fn();
      });
      return result;
    } finally {
      await session.endSession();
    }
  }
}
```

**Limitação**: a session não propaga automaticamente para queries feitas fora do bloco via `ExamModel.updateOne(...)` — ela não verá a session. Para transação real, passe `session` explicitamente em cada `.exec()`. Isso exige enriquecer a interface do repo com um parâmetro opcional de contexto — pesado. Frequentemente o sinal é que o design quer um aggregate maior.

## Clientes externos (OpenAI, Stripe, webhooks)

Mesma regra: interface em `domain/ports/` ou `application/ports/`, implementação aqui.

```ts
// domain/ports/exam-ai-generator.ts
export interface ExamAiGenerator {
  generate(prompt: string): Promise<GeneratedExamDraft>;
}

// infrastructure/ai/openai-exam-generator.ts
import OpenAI from 'openai';
import { ExamAiGenerator } from '@/domains/exam/domain/ports/exam-ai-generator';

export class OpenAiExamGenerator implements ExamAiGenerator {
  constructor(private readonly client: OpenAI) {}

  async generate(prompt: string) {
    const response = await this.client.chat.completions.create({ /* ... */ });
    return { /* ... */ };
  }
}
```

**Ganho**: use case testa com stub in-memory; swap de OpenAI → Anthropic é trocar uma linha no composition root.

## Conexão Mongo

```ts
// src/infrastructure/database/mongo-connection.ts
import mongoose from 'mongoose';

export async function connectMongo(uri: string): Promise<void> {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
}

export async function disconnectMongo(): Promise<void> {
  await mongoose.disconnect();
}
```

Chamada no composition root — ver [composition-root.md](composition-root.md).

## Índices

Índices ficam no schema Mongoose (`index: true` no campo, ou `schema.index({ ... })` para compostos). **Não** em migrations separados — o schema é a fonte da verdade.

```ts
examSchema.index({ ownerId: 1, createdAt: -1 });   // listagem por owner
examSchema.index({ publishedAt: 1 }, { sparse: true });
```

Documente o motivo do índice em comentário curto quando não for óbvio.
