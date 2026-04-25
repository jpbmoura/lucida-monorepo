# Composition Root

**Um** arquivo onde todas as dependências são instanciadas e plugadas. Sem decorators, sem container mágico, sem singletons implícitos. Se uma dependência é construída em outro lugar, é bug.

## Arquivo `src/main.ts`

```ts
import express from 'express';
import { connectMongo } from './infrastructure/database/mongo-connection';
import { errorHandler } from './infrastructure/middlewares/error-handler';
import { SystemClock } from './shared/infrastructure/system-clock';

// Exam feature
import { MongooseExamRepository } from './domains/exam/infrastructure/persistence/mongoose-exam.repository';
import { CreateExamUseCase } from './domains/exam/application/use-cases/create-exam/create-exam.use-case';
import { GetExamByIdUseCase } from './domains/exam/application/use-cases/get-exam-by-id/get-exam-by-id.use-case';
import { ListExamsForUserUseCase } from './domains/exam/application/use-cases/list-exams-for-user/list-exams-for-user.use-case';
import { ExamController } from './domains/exam/presentation/exam.controller';
import { makeExamRoutes } from './domains/exam/presentation/exam.routes';

async function bootstrap() {
  await connectMongo(process.env.MONGO_URI!);

  // shared
  const clock = new SystemClock();

  // Exam: repos → use cases → controller → router
  const examRepo = new MongooseExamRepository();
  const createExam = new CreateExamUseCase(examRepo);
  const getExamById = new GetExamByIdUseCase(examRepo);
  const listExamsForUser = new ListExamsForUserUseCase(examRepo);
  const examController = new ExamController(createExam, getExamById, listExamsForUser);

  // app
  const app = express();
  app.use(express.json());
  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.use('/v1/exams', makeExamRoutes(examController));
  app.use(errorHandler);                         // por último

  const port = Number(process.env.PORT ?? 3000);
  app.listen(port, () => console.log(`listening on :${port}`));
}

bootstrap().catch((err) => {
  console.error('bootstrap failed', err);
  process.exit(1);
});
```

## Quando ficar grande: factory por feature

Quando `main.ts` passa de ~150 linhas, extraia **factory por feature**:

```ts
// src/domains/exam/exam.module.ts
import { Router } from 'express';
import { MongooseExamRepository } from './infrastructure/persistence/mongoose-exam.repository';
import { CreateExamUseCase } from './application/use-cases/create-exam/create-exam.use-case';
import { GetExamByIdUseCase } from './application/use-cases/get-exam-by-id/get-exam-by-id.use-case';
import { ListExamsForUserUseCase } from './application/use-cases/list-exams-for-user/list-exams-for-user.use-case';
import { ExamController } from './presentation/exam.controller';
import { makeExamRoutes } from './presentation/exam.routes';
import { Clock } from '@/shared/application/ports/clock';

interface ExamModuleDeps {
  clock: Clock;
}

export function makeExamModule(deps: ExamModuleDeps): Router {
  const examRepo = new MongooseExamRepository();
  const createExam = new CreateExamUseCase(examRepo);
  const getExamById = new GetExamByIdUseCase(examRepo);
  const listExamsForUser = new ListExamsForUserUseCase(examRepo);
  const controller = new ExamController(createExam, getExamById, listExamsForUser);
  return makeExamRoutes(controller);
}
```

Main reduzido:

```ts
async function bootstrap() {
  await connectMongo(process.env.MONGO_URI!);
  const clock = new SystemClock();

  const app = express();
  app.use(express.json());
  app.use('/v1/exams', makeExamModule({ clock }));
  app.use('/v1/users', makeUserModule({ clock }));
  app.use('/v1/billing', makeBillingModule({ clock, stripeSecret: process.env.STRIPE_SECRET! }));
  app.use(errorHandler);

  const port = Number(process.env.PORT ?? 3000);
  app.listen(port);
}
```

## Dependências compartilhadas

Se `Clock`, `Logger`, `EventBus` são usados por várias features, instancie no main e passe via deps:

```ts
const clock = new SystemClock();
const logger = new PinoLogger();
const eventBus = new InProcessEventBus();

app.use('/v1/exams', makeExamModule({ clock, logger, eventBus }));
app.use('/v1/users', makeUserModule({ clock, logger, eventBus }));
```

## Env vars

Leia **no composition root**, não em camadas profundas. Passe valores concretos.

```ts
// ❌ ruim — infra lê env direto
export class OpenAiExamGenerator {
  private client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
}

// ✅ ok — main lê e injeta
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const aiGen = new OpenAiExamGenerator(openai);
```

Isso torna impossível esquecer uma env var (bootstrap falha no início) e facilita teste (injeta um client mock).

Para validar env de uma vez só:

```ts
// src/infrastructure/config/env.ts
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  MONGO_URI: z.string().url(),
  OPENAI_API_KEY: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),
});

export const env = schema.parse(process.env);
```

Use `env.MONGO_URI` em vez de `process.env.MONGO_URI!`. **Exceção legítima**: usar Zod aqui está fora das "Zod só em presentation" — é validação de configuração de processo, não de input HTTP. Isso está explicitamente ok.

## Shutdown gracioso

```ts
async function bootstrap() {
  await connectMongo(env.MONGO_URI);
  // ...
  const server = app.listen(env.PORT);

  const shutdown = async () => {
    console.log('shutting down');
    server.close();
    await disconnectMongo();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
```

## Por que não tsyringe/inversify?

Trade-off consciente. Containers resolvem tipagem de DI automaticamente, mas:
- Exigem decorators + `reflect-metadata` + `experimentalDecorators` no tsconfig.
- Ordem de import vira frágil (classes precisam ser importadas para serem registradas).
- O grafo de dependências fica **invisível** — escondido no container.

Com 4-30 features, factories explícitas cabem em 100-300 linhas de `main.ts` e **o grafo é literalmente o arquivo**. Quando esse arquivo doer, reconsidere. Não antes.

## Anti-patterns

- ❌ Instanciar repo/use case em qualquer lugar fora do composition root (ou factory de módulo).
- ❌ Usar `process.env.X` em domínio/application/controller. Valores chegam via construtor.
- ❌ Singletons via `export const examRepo = new MongooseExamRepository()`. Dificulta teste e esconde acoplamento.
- ❌ Registrar rotas no import side-effect. Factory function sempre.
