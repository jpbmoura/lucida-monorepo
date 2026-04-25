# @lucida/api

Backend do monorepo Lucida. Express 5 + TypeScript + MongoDB (Mongoose) + Zod.

Arquitetura: Clean Architecture + DDD por feature. Veja o skill
[`backend-clean-ddd`](../../.claude/skills/backend-clean-ddd/SKILL.md) para os padrões.

## Estrutura

```
src/
  app.ts                    ← Express app factory (middlewares, rotas)
  server.ts                 ← entrypoint (bootstrap + listen)
  main.ts                   ← composition root (wiring de deps)
  env.ts                    ← validação de env com Zod
  domains/                  ← uma pasta por bounded context
    <feature>/
      domain/               ← entidades, VOs, interfaces de repo, erros
      application/          ← use cases, DTOs
      infrastructure/       ← schema/repo Mongoose, mappers
      presentation/         ← controller, rotas, schemas Zod
  infrastructure/
    database/mongodb/       ← conexão Mongo
    middlewares/            ← middlewares globais
  shared/
    errors/                 ← DomainError base
```

## Scripts

- `pnpm dev` — tsx watch
- `pnpm build` — tsc + tsc-alias
- `pnpm start` — roda `dist/server.js`
- `pnpm typecheck` — tsc --noEmit
- `pnpm test` — vitest
