---
name: backend-clean-ddd
description: Padrões para código backend TypeScript neste workspace (Express 5 + MongoDB/Mongoose). Aplica DDD por feature + Clean Architecture — camada de domínio pura, use cases em application, Mongoose isolado em infrastructure atrás de interfaces de repositório, Zod só em presentation, erros via throw de DomainError, DI manual via composition root. Carregue ao criar/editar feature, endpoint, entidade, repositório, use case, controller ou rota em lucida-api-v2, lucida-api, ou qualquer backend TS+Express+Mongo novo. Também serve como guia de revisão de código backend existente.
---

# Backend Clean Architecture + DDD

TypeScript, Express 5, MongoDB via Mongoose. Padrão opinativo — siga sem negociar exceto nos casos marcados como "deviação permitida".

## Regra fundamental: direção da dependência

```
presentation ──▶ application ──▶ domain ◀── infrastructure
```

- `domain` **não importa nada** de frameworks (nem mongoose, express, zod, clerk). TypeScript puro.
- `application` importa só `domain`.
- `infrastructure` implementa interfaces declaradas em `domain` (ex: repositórios).
- `presentation` importa `application` (para chamar use cases) e `domain` (para tipos de erro). **Nunca** importa `infrastructure` direto.

Se você está prestes a `import` atravessando essa seta no sentido errado, pare e reconsidere.

## Estrutura por feature

Cada bounded context vira uma pasta em `src/domains/`:

```
src/domains/exam/
  domain/                 ← entidades, value objects, domain services, erros, interfaces de repo
  application/            ← use cases, DTOs de entrada/saída
  infrastructure/         ← schema + repo Mongoose, mappers, clientes externos
  presentation/           ← controller, rotas, schemas Zod
```

Detalhes: ver [folder-structure.md](references/folder-structure.md).

## Os 15 mandamentos

1. Domain layer é **TypeScript puro** — zero imports de libs externas (exceto `node:crypto` e similares de runtime).
2. **Value Object** para identificadores e primitivos com significado (`ExamId`, `Email`, `Minutes`). Imutáveis, validados em factory estática.
3. **Entidade** tem id, protege invariantes, muta via métodos (nunca propriedades públicas atribuíveis).
4. **Aggregate root** é o único ponto de mutação das suas entidades filhas. Repositórios operam em aggregate roots.
5. **Interface de repositório em `domain/`**, implementação Mongoose em `infrastructure/`. Interface fala de tipos do domínio, nunca de `Document` do Mongoose.
6. **Mapper** converte entre documento Mongo e entidade de domínio. Nunca vaze `Document` para application/presentation.
7. **Use case = uma classe, uma operação**. Método público `execute(input): Promise<output>`. Nome verbo-primeiro: `CreateExamUseCase`.
8. Use case depende de **interfaces** (`ExamRepository`), injetadas via construtor. Nunca instancia repo/serviço direto.
9. Violação de regra de negócio = **throw** de subclasse de `DomainError`. Não use Result/Either aqui (decisão explícita do projeto).
10. **Zod só em presentation**. Parsea `req.body/query/params`, produz DTO plano, chama use case. Se aparecer Zod em application/domain, mova.
11. **Controller é fino** — validação (Zod) + chamada de use case + resposta HTTP. Zero lógica de negócio.
12. **Error middleware global** mapeia `DomainError` → status HTTP via propriedade `statusCode` na classe de erro.
13. **Composition root** (um arquivo, tipicamente `src/main.ts`) instancia tudo via factory functions. Sem decorators, sem DI container.
14. **Naming**: arquivos `kebab-case`, classes `PascalCase`, variáveis/funções `camelCase`. **Sem `I` prefix** em interfaces.
15. **Testes unitários** para entidades e use cases usam repo in-memory implementando a mesma interface. Mongo fica em teste de integração.

## Navegação por arquivos de referência

Carregue a referência específica quando for trabalhar naquela camada:

- Layout de pastas e nomes → [folder-structure.md](references/folder-structure.md)
- Entidades, VOs, aggregates, domain services → [domain-layer.md](references/domain-layer.md)
- Use cases, DTOs, orquestração → [application-layer.md](references/application-layer.md)
- Schemas Mongoose, repositórios, mappers → [infrastructure-layer.md](references/infrastructure-layer.md)
- Controllers Express, rotas, Zod → [presentation-layer.md](references/presentation-layer.md)
- Composition root, wiring de dependências → [composition-root.md](references/composition-root.md)
- Hierarquia de erros de domínio + middleware → [errors.md](references/errors.md)
- Templates de teste → [testing.md](references/testing.md)
- **Criar feature nova do zero** → [scaffolding-checklist.md](references/scaffolding-checklist.md)

## Deviações permitidas

- **CRUD trivial sem regra de negócio**: se a feature é literalmente "salvar e buscar por id" sem invariantes, value objects e aggregate root viram ruído. Aceite um módulo mais simples (schema + repo + controller, sem use case por operação). Marque com comentário no topo do arquivo do controller: `// deviation: thin CRUD, no domain layer`.
- **Script one-off / job**: scripts em `scripts/` ou jobs que rodam uma vez não precisam de camadas. Só não importe coisas de `src/domains/*/infrastructure` em código de domínio de outra feature.

## Ao revisar código backend existente

Checklist rápido:
1. Tem `import mongoose` em arquivo fora de `infrastructure/`? → violação.
2. Tem `req`/`res` em arquivo fora de `presentation/`? → violação.
3. Tem validação Zod em `application/` ou `domain/`? → violação.
4. Repositório retorna `Document`/`LeanDocument` em vez de entidade? → falta mapper.
5. Use case tem mais de um método público? → provavelmente é mais de um use case.
6. Controller tem `if` de regra de negócio? → mover para use case ou entidade.
7. Erro lançado como `new Error(...)` sem subclasse de `DomainError`? → criar erro nomeado ou deixar vazar (bug de infra).

## Ao criar código backend novo

1. Ler [scaffolding-checklist.md](references/scaffolding-checklist.md).
2. Fazer as perguntas listadas lá **antes** de começar se o usuário não deu contexto.
3. Construir na ordem: domain → application → infrastructure → presentation → wiring → testes.
4. Cada arquivo tem um propósito único; não agrupe "utils".
