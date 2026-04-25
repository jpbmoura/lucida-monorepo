# Scaffolding uma feature nova

Quando o usuário pede "crie uma feature de X" ou "adicione entidade Y", siga este checklist em ordem. **Cada passo tem um arquivo novo** — não agrupe arquivos.

Feature exemplo aqui: `book` em `src/domains/book/`.

## Perguntas a fazer ANTES de começar

Se o usuário não deu contexto, **pergunte**:

1. **Quais operações** a feature precisa? (CRUD completo? só create/read? listagem com filtros/paginação?)
2. **Quais invariantes** o aggregate tem? (ex: "não pode editar depois de publicado", "email único", "preço não negativo")
3. **Escopo do id**? (Clerk user id externo? UUID novo? referência a outro aggregate?)
4. **Precisa autenticação**? Qual middleware usar (`requireAuth` do projeto? Clerk?).
5. **Integrações externas**? (Stripe, OpenAI, webhooks) — vira port + adapter.
6. **Esta feature compartilha dados com outra já existente**? (ex: reusa `User`, `Exam` — grep para não duplicar schema)

Sem respostas para 1 e 2, você está scaffolding no escuro. **Pare e pergunte.**

## Passo 1 — Domain

Decida o aggregate root primeiro. Depois VOs e erros.

- [ ] `domain/value-objects/book-id.ts` — VO de identificador (UUID via `node:crypto`).
- [ ] `domain/value-objects/isbn.ts` — VO se há regra de validação (senão, deixe string no entity props).
- [ ] Outros VOs que o entity precisa (ex: `BookTitle`, `Price`).
- [ ] `domain/errors/book-errors.ts` — pelo menos `BookNotFoundError` (404). Adicione específicos conforme descobrir regra.
- [ ] `domain/entities/book.ts` — entity com `create`, `restore`, getters, métodos de mutação (nomes de negócio).
- [ ] `domain/repositories/book-repository.ts` — interface. Comece com `findById`, `save`. Adicione `findBy*` conforme use cases pedirem — **não adicione antes**.

Referência: [domain-layer.md](domain-layer.md).

## Passo 2 — Application

Um arquivo por use case, dentro de pasta própria.

- [ ] `application/use-cases/create-book/create-book.dto.ts`
- [ ] `application/use-cases/create-book/create-book.use-case.ts`
- [ ] `application/use-cases/get-book-by-id/get-book-by-id.dto.ts`
- [ ] `application/use-cases/get-book-by-id/get-book-by-id.use-case.ts`
- [ ] Outros use cases na mesma estrutura.

Cada use case:
- Implementa `UseCase<Input, Output>`.
- Injeta só os ports que usa.
- Retorna DTO plano, nunca entidade.

Referência: [application-layer.md](application-layer.md).

## Passo 3 — Infrastructure

- [ ] `infrastructure/persistence/book.schema.ts` — Mongoose schema + model. `_id: string`, `timestamps: false`, `versionKey: false`.
- [ ] `infrastructure/persistence/book.mapper.ts` — `toDomain` / `toPersistence`.
- [ ] `infrastructure/persistence/mongoose-book.repository.ts` — implementa a interface, usa `.lean()` em leitura.

Se tem integração externa:
- [ ] `infrastructure/<service>/<provider>-<port-name>.ts` (ex: `infrastructure/ai/openai-book-summarizer.ts`).

Referência: [infrastructure-layer.md](infrastructure-layer.md).

## Passo 4 — Presentation

- [ ] `presentation/schemas/create-book.schema.ts` — Zod body.
- [ ] `presentation/schemas/get-book.schema.ts` — Zod params.
- [ ] Um Zod schema por endpoint com input.
- [ ] `presentation/book.controller.ts` — um método por endpoint, arrow function de campo.
- [ ] `presentation/book.routes.ts` — `makeBookRoutes(controller): Router`.

Referência: [presentation-layer.md](presentation-layer.md).

## Passo 5 — Wiring

- [ ] `book.module.ts` **ou** adicione as linhas correspondentes em `main.ts` — instancie repo → use cases → controller → rota.
- [ ] Se tem env var nova, adicione em `src/infrastructure/config/env.ts` (se existir) ou documente em `.env.example`.

Referência: [composition-root.md](composition-root.md).

## Passo 6 — Testes

- [ ] `__tests__/helpers/in-memory-book-repository.ts`
- [ ] `__tests__/entities/book.spec.ts` — invariantes da entity, um teste por método de mutação.
- [ ] `__tests__/use-cases/create-book.use-case.spec.ts` — happy path + pelo menos um erro de domínio.
- [ ] Um spec por use case crítico (ao menos os que mudam estado).

Referência: [testing.md](testing.md).

## Passo 7 — Verificação

- [ ] `pnpm lint` / `npm run lint` / `yarn lint` (conforme o projeto) passa.
- [ ] `pnpm build` / `npm run build` passa.
- [ ] Endpoint happy path testado manualmente (curl / Postman / extensão REST client do VS Code).
- [ ] Se há autenticação, testado também o 401.
- [ ] Commit separado por passo facilita review (opcional, só faça se o usuário pedir).

## Ordem não-negociável

Não pule passos nem inverta ordem. `domain` antes de tudo; `application` antes de `infrastructure`; wiring só depois que os três existem. Se começar por controller, você vai descobrir que falta um conceito de domínio e terá retrabalho.

## Sinais de deviação (OK ignorar parte do checklist)

- **CRUD trivial**: se a entity não tem invariante nenhuma (pure data), pule VOs e use cases. Controller → schema Mongoose → repo → route. Marque no controller:
  ```ts
  // deviation: thin CRUD, no domain layer
  ```
- **Integração read-only com API externa** (ex: "busque dados do YouTube"): não precisa de aggregate. É um service em `infrastructure/` exposto por controller. Sem domain layer.
- **Endpoint de utilidade** (health, version): controller direto no `main.ts`, sem feature folder.

## Exemplo mental antes de começar

Use este rascunho de texto antes de escrever código:

```
Feature: book
Aggregate root: Book
VOs: BookId, ISBN, BookTitle
Invariantes:
  - ISBN único globalmente
  - título não pode mudar depois de publicado
Operações (use cases):
  - CreateBook
  - PublishBook
  - GetBookById
  - ListBooksByAuthor (paginado)
Ports externos: nenhum
Auth: requer requireAuth, ownerId = req.auth.userId
```

Se você não consegue escrever esse rascunho, **volte a fazer perguntas**. Scaffolding sem saber disso é rebuild garantido.
