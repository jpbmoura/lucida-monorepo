# Plano de implementação — Camada "Curso" entre Professor e Turma

Doc gerado pra orientar a implementação. Hierarquia atual: `Professor → Turma → Prova`. Alvo: `Professor → Curso → Turma → Prova`.

## 1. Decisões travadas

| Decisão | Escolha |
|---|---|
| Semântica de Curso | **Agrupador genérico** — só `name` + `description` opcional. Sem campos de instituição/disciplina (já existem `subject` e `grade` na turma). |
| Escopo / dono | **Sempre por professor (`ownerId`)**. Mesmo dentro de uma org, cada professor tem sua lista. Espelha o modelo de `class`. |
| Obrigatoriedade | **`courseId` NOT NULL em `class`**. Backfill cria um curso "Geral" por professor. |
| Denormalização | **`courseId` snapshot em `exam`, `student`, `submission`** (mesmo padrão do `organizationId`/`classId` atual). Atualizado em cascata se a turma mudar de curso. |
| Delete de curso com turmas | **Bloquear (409 Conflict)**. Frontend pede mover/excluir turmas antes. |
| UX | Nova página `/app/cursos` (CRUD) + select obrigatório no form de turma + sidebar com cursos expansíveis. |
| URLs internas existentes | **Mantidas** (`/app/turmas/[id]`, `/app/turmas/[id]/provas/[id]`). Sem refactor de rotas. |
| Links públicos do aluno | **Intocados.** `/exam/[shareId]` e `/exam/[shareId]/start/[token]` independem de turma/curso. |
| Kintal | **Sem mudanças.** Backoffice não toca turma hoje e não precisa ver curso na primeira versão. |
| Public API | Novo recurso `/v1/public/courses` + `courseId` opcional em `class` (default = curso "Geral" do dono da chave). |

## 2. Visão geral

```
ANTES                              DEPOIS
─────                              ──────
Professor (ownerId)                Professor (ownerId)
└── Turma                          └── Curso          ← NOVO (agrupador genérico)
    ├── Aluno                          └── Turma
    └── Prova                              ├── Aluno
        └── Submission                     └── Prova
                                               └── Submission
```

`courseId` flui em snapshot pra todas as coleções abaixo de turma — analytics e queries
agregadas filtram por curso sem `$lookup`.

---

## 3. Backend — novo domínio `course`

Criar em [`apps/api/src/domains/course/`](apps/api/src/domains/course/) espelhando a estrutura
de [`class/`](apps/api/src/domains/class/). Padrões definidos no skill `backend-clean-ddd`.

### 3.1. `domain/`

- **`course-id.ts`** — Value Object idêntico a `ClassId` (cuid2 ou `nanoid`, decisão segue o mesmo de `class-id.ts`).
- **`course-errors.ts`** — `CourseNameInvalidError`, `CourseDescriptionInvalidError`, `CourseNotFoundError`, **`CourseHasClassesError`** (lançado pelo delete quando há turmas).
- **`course.ts`** — Entity:
  ```ts
  interface CourseProps {
    id: CourseId;
    name: string;
    description: string;
    ownerId: string;
    organizationId: string | null; // snapshot, igual a class
    createdAt: Date;
    updatedAt: Date;
  }
  ```
  Validações: `name` 2–120 chars (igual a turma), `description` ≤ 200. Métodos `rename`, `updateDescription`, `isOwnedBy`. **Sem `subject`/`grade`** — é agrupador genérico.
- **`course-repository.ts`** — interface:
  ```ts
  nextId(): CourseId
  save(course: Course): Promise<void>
  findById(id: CourseId): Promise<Course | null>
  findByOwner(ownerId: string): Promise<Course[]>
  delete(id: CourseId): Promise<void>
  ```
  Não precisa de `findByOrganizationPaginated` no MVP (cursos são per-owner; analytics vai consumir via `findByOwner`).

### 3.2. `infrastructure/`

- **`course-schema.ts`** — Mongoose:
  ```ts
  collection: "courses"
  _id: string, name, description, ownerId (idx), organizationId (idx, nullable),
  timestamps: true
  index: { ownerId: 1, createdAt: -1 }
  ```
- **`mongoose-course-repository.ts`** — implementação direta (sem paginação por org no MVP).

### 3.3. `application/` — use cases

| Use case | Constructor deps | Notas |
|---|---|---|
| `CreateCourseUseCase` | `courses` | Cria curso pro `ownerId` da sessão. |
| `UpdateCourseUseCase` | `courses` | Verifica `isOwnedBy`. |
| `ListCoursesUseCase` | `courses`, `classes` | Lista cursos do owner + contador `classCount` por curso. Agrega via `class.countByCourse(courseId)` ou `Map`. |
| `GetCourseUseCase` | `courses`, `classes` | Detalhe + lista de turmas do curso. |
| `DeleteCourseUseCase` | `courses`, `classes` | **Bloqueia se `classes.countByCourse(courseId) > 0`** → lança `CourseHasClassesError` (HTTP 409). |
| `MoveCourseClassesUseCase` *(opcional, nice-to-have)* | `courses`, `classes` | Move todas as turmas de curso A pra B (UX de "mover antes de deletar"). |

### 3.4. `presentation/`

- **`course-schemas.ts`** — Zod: `CreateCourseSchema { name, description? }`, `UpdateCourseSchema`.
- **`course-controller.ts`** — handlers `create`, `list`, `get`, `update`, `delete`. `deleteHandler` mapeia `CourseHasClassesError` → 409.
- **`course-routes.ts`** — espelha [`class-routes.ts`](apps/api/src/domains/class/presentation/class-routes.ts):
  ```
  GET    /v1/courses
  POST   /v1/courses
  GET    /v1/courses/:id
  PUT    /v1/courses/:id
  DELETE /v1/courses/:id
  ```

---

## 4. Backend — alterações em `class` e dependentes

### 4.1. Domínio `class`

- [`apps/api/src/domains/class/domain/class.ts`](apps/api/src/domains/class/domain/class.ts):
  - Adicionar `courseId: string` em `ClassProps` (NOT NULL).
  - Adicionar parâmetro `courseId` em `Class.create({...})` (obrigatório).
  - Novo método `moveToCourse(newCourseId, now)` — atualiza `courseId` e `updatedAt`.
  - Não precisa novo Value Object (segue como `string`, padrão de `ownerId`/`organizationId`).
- [`apps/api/src/domains/class/domain/class-errors.ts`](apps/api/src/domains/class/domain/class-errors.ts):
  - `ClassCourseInvalidError` (curso não existe ou não é do mesmo owner).
- [`apps/api/src/domains/class/infrastructure/class-schema.ts`](apps/api/src/domains/class/infrastructure/class-schema.ts):
  - Adicionar `courseId: { type: String, required: true, index: true }`.
  - Novo índice composto `{ courseId: 1, createdAt: -1 }`.
- [`apps/api/src/domains/class/domain/class-repository.ts`](apps/api/src/domains/class/domain/class-repository.ts):
  - `findByCourse(courseId: string): Promise<Class[]>`.
  - `countByCourse(courseId: string): Promise<number>`.
  - `findByOwner` ganha filtro opcional `{ courseId?: string }`.
- [`apps/api/src/domains/class/application/`](apps/api/src/domains/class/application/):
  - `CreateClassUseCase` — recebe `courseId`; **valida** que o curso existe e `course.isOwnedBy(ownerId)`. Lança `ClassCourseInvalidError` se não.
  - `UpdateClassUseCase` — aceita `courseId` opcional pra mover turma entre cursos. Mesma validação. Quando muda, **dispara propagação de denormalização** (ver 4.2).
  - `ListClassesUseCase` — opcionalmente filtra por `courseId` (query param).
  - `DeleteClassUseCase` — sem mudança lógica (cascata em alunos/provas/submissões continua).
  - **Novo dep:** todos esses use cases que validam curso recebem `CourseRepository` no constructor.
- [`apps/api/src/domains/class/presentation/class-schemas.ts`](apps/api/src/domains/class/presentation/class-schemas.ts):
  - `CreateClassSchema` ganha `courseId: z.string()`. Update idem opcional.

### 4.2. Domínios dependentes — denormalização de `courseId`

Padrão: cada coleção ganha `courseId: string` indexado, populado a partir do `class.courseId` no momento da criação. Quando a turma muda de curso, propagar via `updateMany`.

**`student`** ([`apps/api/src/domains/student/`](apps/api/src/domains/student/)):
- Schema: +`courseId` (required, index). Composto `{ courseId, createdAt }` se houver query.
- Entity `Student`: +`courseId` em props/create/restore.
- Repo: +`findByCourse`, +`countByCourse`. `updateCourseForClass(classId, newCourseId)` pra propagação.
- `CreateStudentUseCase`: lê `class.courseId` e injeta no `Student.create`.

**`exam`** ([`apps/api/src/domains/exam/`](apps/api/src/domains/exam/)):
- Schema: +`courseId` (required, index). Composto `{ courseId, createdAt }`.
- Entity `Exam`: +`courseId` em props/create.
- Repo: +`findByCourse`, +`countByCourse`. `updateCourseForClass(classId, newCourseId)`.
- `CreateExamUseCase`: lê `class.courseId` e injeta. Se a prova é criada antes de existir um Course (caminho legacy), usar curso "Geral" do owner.

**`submission`** ([`apps/api/src/domains/submission/`](apps/api/src/domains/submission/)):
- Schema: +`courseId` (required, index).
- Entity `Submission`: +`courseId`.
- Repo: +`findByCourse`, +`updateCourseForClass`.
- Casos `BeginExam*`, `SubmitExam` lêem `exam.courseId` (ou `class.courseId`) e propagam.

### 4.3. Propagação na mudança `class.courseId`

Quando `UpdateClassUseCase` muda `courseId`:
1. `class.moveToCourse(newCourseId)` + `classes.save(class)`.
2. `students.updateCourseForClass(classId, newCourseId)`.
3. `exams.updateCourseForClass(classId, newCourseId)`.
4. `submissions.updateCourseForClass(classId, newCourseId)`.

Os 4 passos rodam em uma transação Mongo (`session.withTransaction`) já que o ambiente exige replica set. Documentar no use case.

---

## 5. Backend — analytics

[`apps/api/src/domains/analytics/`](apps/api/src/domains/analytics/) — agregações por professor agora podem agrupar por curso.

### 5.1. Mudanças nos use cases existentes

| Use case | Mudança |
|---|---|
| `ComputeOverviewUseCase` (do professor) | Resposta inclui `courses: Array<{ id, name, classCount, examCount, ... }>`. Agrupa as turmas por `class.courseId` antes de retornar. |
| `ComputeTeacherOverviewUseCase` (admin de instituição vendo um professor) | Idem — adiciona dimensão "Cursos" no DTO. |
| `ComputeClassOverviewUseCase` | Inclui `courseId`/`courseName` na resposta. Hidrata via `coursesRepo.findById`. |
| `ComputeExamOverviewUseCase` | Inclui `courseId`/`courseName`. |
| `ComputeStudentOverviewUseCase` | Inclui `courseId`/`courseName` (do `student.courseId` denormalizado). |
| `ExportTeacherDataUseCase` | Adiciona coluna "Curso" no export. |

### 5.2. Novo use case (opcional, fase 2)

- `ComputeCourseOverviewUseCase` — overview agregado de um curso específico (turmas, alunos, provas, médias). Espelha `ComputeClassOverviewUseCase`.
- Rota: `GET /v1/teachers/courses/:id/overview`.

### 5.3. Constructor deps

`ComputeOverviewUseCase`, `ComputeTeacherOverviewUseCase`, `ComputeClassOverviewUseCase` ganham `CourseRepository` pra hidratar nomes.

---

## 6. Backend — public-api

[`apps/api/src/domains/public-api/`](apps/api/src/domains/public-api/) — REST externo.

### 6.1. Novo recurso

- `GET /v1/public/courses` — lista cursos do owner da chave (com filtro `?ownerId=` se chave da org).
- `POST /v1/public/courses` — cria curso.
- `GET /v1/public/courses/:id` — detalhe.

### 6.2. `class` (público) — compatibilidade retroativa

- `GET /v1/public/classes` resposta inclui `courseId` + `courseName`.
- `POST /v1/public/classes` aceita `courseId` opcional. **Se ausente, usa curso "Geral" do owner da chave** (cria se não existir). Garante que clientes externos atuais continuam funcionando.
- Filtro `?courseId=X` em `GET /v1/public/classes`.

### 6.3. Docs — atualizar

- [`apps/web/src/app/docs/api/`](apps/web/src/app/docs/api/) — adicionar página `cursos/page.tsx` e atualizar `provas/`, `quickstart`, examples.

---

## 7. Backend — composition root

[`apps/api/src/main.ts`](apps/api/src/main.ts) — adicionar (na ordem certa: course **antes** de class):

```ts
// repositories
const courseRepository = new MongooseCourseRepository();
// (existing) const classRepository = ...

// course domain
const courseController = new CourseController({
  createCourse: new CreateCourseUseCase(courseRepository),
  listCourses: new ListCoursesUseCase(courseRepository, classRepository),
  getCourse: new GetCourseUseCase(courseRepository, classRepository),
  updateCourse: new UpdateCourseUseCase(courseRepository),
  deleteCourse: new DeleteCourseUseCase(courseRepository, classRepository),
});

// class domain — agora depende de courseRepository
const classController = new ClassController({
  createClass: new CreateClassUseCase(classRepository, courseRepository),
  updateClass: new UpdateClassUseCase(
    classRepository, courseRepository, studentRepository, examRepository, submissionRepository,
  ),
  // ...
});

// student/exam/submission — controllers/use cases que criam essas entidades
// passam a receber classRepository (já recebem) e leem class.courseId
// pra denormalizar.

// analytics — use cases ganham courseRepository
const analyticsController = new AnalyticsController({
  computeOverview: new ComputeOverviewUseCase(classRepository, examRepository, courseRepository),
  // ...
});

// public-api
const publicCoursesController = new PublicCoursesController({ ... });

// routers
const routers = [
  // ...
  makeCourseRouter({ requireAuth, controller: courseController }),
  makeClassRouter({ requireAuth, controller: classController }),
  // ...
  makePublicCoursesRouter({ requireApiKey, controller: publicCoursesController }),
];
```

---

## 8. Migração — script de backfill

Criar [`apps/api/scripts/backfill-courses/index.ts`](apps/api/scripts/backfill-courses/index.ts) espelhando o padrão de [`backfill-class-org/index.ts`](apps/api/scripts/backfill-class-org/index.ts) (idempotente, `--dry-run`).

**Objetivo:** garantir que toda turma e dependentes (`student`, `exam`, `submission`) tenham `courseId` populado, criando um curso "Geral" por professor.

Algoritmo:

```
1. Conectar Mongo + BetterAuth db.
2. distinct(ownerId) em classes.
3. Pra cada owner:
   a. Procurar curso já existente { ownerId, name: "Geral" }.
   b. Se não existir, criar com ownerId + organizationId snapshot
      (do membership BA mais antigo).
   c. updateMany em classes onde { ownerId, courseId: { $exists: false } }
      pra setar { courseId: <generalCourseId> }.
4. Pra cada classe (de novo): propagar courseId em students,
   exams, submissions via updateMany por classId.
5. Logar totais (cursos criados, turmas/alunos/provas/submissões atualizados).
```

Adicionar script ao [`apps/api/package.json`](apps/api/package.json):
```json
"backfill:courses": "tsx scripts/backfill-courses/index.ts"
```

**Ordem de execução em produção:**
1. Deploy backend com `courseId` **opcional** (nullable) no schema + domínio Course funcionando.
2. Rodar `pnpm --filter @lucida/api run backfill:courses` (replica set já é requisito da app).
3. Verificar via `pnpm --filter @lucida/api run diagnose:legacy-ids` *(pode ser análogo: criar `diagnose:missing-course-id` se valer)*.
4. Deploy backend tornando `courseId` **NOT NULL** no schema + use cases exigindo.
5. Deploy frontend novo.

---

## 9. Frontend — LucidaExam (`apps/web/src/app/app/`)

Padrões no skill `lucida-frontend` + `brand-lucida` (paleta Exam azul).

### 9.1. Nova feature `apps/web/src/features/app/cursos/`

Criar:
- `cursos-list.tsx` — lista de cursos do professor em cards. Botão "Novo curso".
- `curso-card.tsx` — card com nome, descrição, contador de turmas, ações (editar/excluir).
- `curso-form-dialog.tsx` — Dialog com `react-hook-form` + Zod (`name`, `description?`).
- `delete-curso-dialog.tsx` — confirmação. Se API responder 409 (CourseHasClasses), mostrar mensagem "Mova ou exclua as turmas antes" + lista das turmas que bloqueiam (vem da resposta).
- `data.ts` — fetchers: `listCourses()`, `getCourse(id)`, etc. Server-only.
- `actions.ts` — Server Actions: `createCourseAction`, `updateCourseAction`, `deleteCourseAction`.
- `types.ts` — DTOs.

### 9.2. Nova rota

- `apps/web/src/app/app/cursos/page.tsx` — Server Component que renderiza `CursosList` com dados pré-fetched.
- `apps/web/src/app/app/cursos/[id]/page.tsx` — detalhe do curso, lista de turmas dentro (reutiliza `TurmaCard`).

### 9.3. Mudanças em features/rotas existentes

| Arquivo | Mudança |
|---|---|
| [`apps/web/src/features/app/turmas/turma-form-dialog.tsx`](apps/web/src/features/app/turmas/turma-form-dialog.tsx) | Adicionar select obrigatório de Curso (`<Combobox>` com lista + botão "+ novo curso" inline que abre `curso-form-dialog`). |
| [`apps/web/src/features/app/turmas/turma-list.tsx`](apps/web/src/features/app/turmas/turma-list.tsx) | Agrupar visualmente por curso (collapsible sections) + filtro/busca por curso. |
| [`apps/web/src/features/app/turmas/turma-card.tsx`](apps/web/src/features/app/turmas/turma-card.tsx) | Mostrar nome do curso como sublinha. |
| [`apps/web/src/features/app/turmas/data.ts`](apps/web/src/features/app/turmas/data.ts) | DTOs de turma incluem `courseId`/`courseName`. |
| [`apps/web/src/features/app/turmas/types.ts`](apps/web/src/features/app/turmas/types.ts) | Idem. |
| [`apps/web/src/features/app/turmas/detail/turma-detail.tsx`](apps/web/src/features/app/turmas/detail/turma-detail.tsx) | Breadcrumb mostra `Cursos / {Curso} / {Turma}` mesmo com URL plana. |
| Sidebar (`apps/web/src/features/app/layout/sidebar.tsx` ou similar) | Item "Cursos" no nav. Lista colapsável: Curso → Turmas dentro. Item ativo destaca a hierarquia. |
| [`apps/web/src/features/app/provas/`](apps/web/src/features/app/provas/) | Onde "selecionar turma" para nova prova/scan: agrupar por curso no select. |
| [`apps/web/src/app/app/page.tsx`](apps/web/src/app/app/page.tsx) (dashboard) | Card "Cursos" com contador. |

**Não mexer em:**
- [`apps/web/src/app/app/turmas/[id]/page.tsx`](apps/web/src/app/app/turmas/[id]/page.tsx) e descendentes — URLs estáveis.
- Rotas `/exam/[shareId]/*` — públicas, intocadas.

### 9.4. Estimativa de arquivos

| Tipo | Quantidade |
|---|---|
| Novos (cursos feature + rota) | ~7 |
| Modificados (turmas + sidebar + dashboard + provas + analises) | ~10 |
| Total LucidaExam | ~17 |

---

## 10. Frontend — LucidaAnalytics (`apps/web/src/app/analytics/`)

Padrão visual: paleta roxa (skill `brand-lucida`).

| Arquivo | Mudança |
|---|---|
| [`apps/web/src/app/analytics/professores/[id]/page.tsx`](apps/web/src/app/analytics/professores/[id]/page.tsx) | Layout ganha seção "Cursos do professor" antes de "Turmas". Cada curso colapsa as turmas dentro. |
| [`apps/web/src/features/analytics/teachers/components/teacher-classes-list.tsx`](apps/web/src/features/analytics/teachers/components/teacher-classes-list.tsx) | Agrupar por curso. Empty state "Sem cursos cadastrados". |
| `teacher-data.ts` (DTO) | DTO ganha `courses: Array<{ id, name, classes: [...] }>`. |
| `teacher-exams-list.tsx`, `teacher-students-list.tsx` | Mostrar coluna/badge de Curso. |

**Sem novas rotas** — analytics continua organizado por professor; curso é dimensão dentro da view do professor.

Estimativa: **~5 arquivos**.

---

## 11. Frontend — Kintal (`apps/web/src/app/kintal/`)

**Sem mudanças.** Kintal não toca turma hoje. Adicionar contador de cursos por professor é nice-to-have e fica fora do MVP. Se for incluir mais tarde, é uma única coluna em `kintal/usuarios` ou similar.

---

## 12. Links públicos do aluno — garantia

Verificado no código atual:

- `/exam/[shareId]` — landing pública. `shareId` é propriedade da `Exam` (gerada na criação). **Não depende de classId nem courseId.**
- `/exam/[shareId]/start/[token]` — token assinado emitido por `IssueExamLinkUseCase` no public-api. Token carrega `examId` + `studentId`; nada da hierarquia.
- API endpoints públicos (`POST /v1/public/exam-links`, etc.) continuam aceitando os mesmos inputs.

**Conclusão:** nenhuma URL ou token de aluno muda. Os links que escolas/alunos têm salvos continuam válidos.

---

## 13. Ordem de implementação faseada

Cada fase é deployável de forma independente, sem downtime.

### Fase 1 — Backend: domínio Course standalone
- Criar domínio `course/` (entity, repo, schema, use cases, controller, routes).
- Wire no composition root.
- Não tocar `class` ainda.
- **Deploy.** Frontend não usa nada disso ainda; rotas existem mas sem consumidor.

### Fase 2 — Backend: `class.courseId` opcional + denormalização opcional
- Adicionar `courseId` (nullable) em `class`, `student`, `exam`, `submission` schemas.
- Use cases continuam funcionando sem courseId.
- **Deploy.**

### Fase 3 — Backfill
- Rodar `backfill:courses` em produção (`--dry-run` primeiro).
- Validar: `db.classes.countDocuments({ courseId: null }) === 0`. Mesmo pra student/exam/submission.

### Fase 4 — Backend: tornar `courseId` NOT NULL + use cases exigentes
- Schemas exigem `courseId` (required: true).
- Use cases validam.
- `UpdateClassUseCase` propaga em transação.
- `DeleteCourseUseCase` bloqueia com 409.
- Public API: aceita `courseId` opcional (default = curso "Geral").
- **Deploy.**

### Fase 5 — Frontend
- Nova feature cursos + rota `/app/cursos`.
- Form de turma com select.
- Sidebar/dashboard atualizados.
- Analytics ganha agrupamento por curso.
- Docs da Public API.
- **Deploy.**

### Fase 6 — Cleanup (opcional, futuro)
- Análises pra ver se faz sentido oferecer "merge cursos" (caso usuário tenha muitos cursos "Geral").
- Métrica: % de professores que renomearam o curso "Geral".

---

## 14. Riscos e armadilhas

| Risco | Mitigação |
|---|---|
| **Replica set obrigatório.** `UpdateClassUseCase` usa transação pra propagar `courseId`. Já é requisito da app (billing usa também). | Documentar no header do use case. |
| **Drift de denormalização.** Se alguém escrever direto no Mongo (script ad hoc), `courseId` em exam/student/submission pode divergir. | Documentar o invariante. Considerar `diagnose:course-drift` script auditando: `forEach class → check students/exams/submissions por classId têm mesmo courseId`. |
| **Public API sem `courseId` no payload.** Clientes existentes continuam mandando `POST /v1/public/classes` sem `courseId`. | Aceitar opcional + injetar curso "Geral" do owner da chave. Documentar no docs como deprecated path. |
| **Migração de dados grandes.** Se um professor tem milhares de turmas/submissões, `updateMany` em produção pode demorar. | Backfill já roda `updateMany` por classId; em volume alto, processar em batches. Idempotente — pode rodar de novo. |
| **UX: curso "Geral" criado pelo backfill polui a UI.** | Renomear curso é fácil; copy "Bem-vindo aos cursos! Renomeie o curso 'Geral' ou crie novos" no primeiro acesso à página `/app/cursos`. |
| **Conflito entre cursos de mesmo nome.** Dois professores podem ter um curso "Geral". OK porque o escopo é por owner. | Sem unique constraint cross-owner. |
| **Deletar professor (caso futuro).** Cascata atual não considera curso. | Adicionar `coursesRepo.deleteByOwner(ownerId)` em qualquer use case de delete-user/leave-org. |
| **Inconsistência entre `class.organizationId` e `course.organizationId`.** Se professor muda de org, snapshot pode divergir. | Já é problema existente em `class`; mantém o mesmo padrão pra `course`. |

---

## 15. Itens fora de escopo (intencional)

- **Cursos compartilhados entre professores** (org-scoped). Decidido: sempre per-owner.
- **Subdivisão dentro de curso** (módulos, unidades). Hierarquia para em curso.
- **Templates de curso** (clonar curso). Futuro.
- **Cursos no Kintal.** Backoffice continua sem visão de curso no MVP.
- **Cursos compostos com disciplina + local.** Decidido: agrupador genérico.
- **Refactor de URLs internas pra `/app/cursos/[id]/turmas/[id]`.** Mantemos URLs planas.
- **Mudança em links públicos do aluno.** Mantidos integralmente.

---

## 16. Checklist de execução resumido

Backend:
- [ ] Criar domínio `course/` (4 camadas) — espelho de `class/`.
- [ ] Wire no `main.ts` (antes de class).
- [ ] Adicionar `courseId` opcional em schemas `class`, `student`, `exam`, `submission`.
- [ ] Adicionar métodos `findByCourse`, `countByCourse`, `updateCourseForClass` nos repos.
- [ ] Use cases `class`: validação de curso, propagação na update.
- [ ] Analytics: hidratar `courseName` + agrupar.
- [ ] Public API: novo recurso + retrocompat.
- [ ] Script `backfill:courses` + entry no `package.json`.
- [ ] Tornar `courseId` NOT NULL pós-backfill.

Frontend:
- [ ] Feature `apps/web/src/features/app/cursos/`.
- [ ] Rota `apps/web/src/app/app/cursos/`.
- [ ] Atualizar form de turma (select obrigatório).
- [ ] Atualizar sidebar (cursos expansíveis).
- [ ] Agrupar lista de turmas por curso.
- [ ] Analytics: agrupar `teacher-classes-list` por curso.
- [ ] Docs Public API.

Validação:
- [ ] `pnpm --filter @lucida/api typecheck` limpo.
- [ ] `pnpm --filter @lucida/web lint` limpo.
- [ ] Backfill `--dry-run` reporta 0 sem-curso após rodar.
- [ ] Smoke test: criar curso, criar turma nele, criar prova, abrir link público de aluno (`/exam/[shareId]`), submeter — fluxo completo passa.
