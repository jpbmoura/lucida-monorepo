# Migração do legacy → monorepo

Guia prático pra portar os dados do sistema antigo (Clerk + coleções
Mongoose plural lowercase) pro shape novo do monorepo (BetterAuth +
coleções do monorepo).

O mesmo roteiro foi validado em QA. Em prod muda apenas as URIs.

---

## Pré-requisitos

1. **Backup** das coleções do target — mesmo sendo idempotente, um `mongodump`
   das 6 coleções do monorepo (`user`, `classes`, `exams`, `students`,
   `submissions`, `scan_results`) custa nada e dá conforto.
2. **Monorepo rodando localmente** com `MONGODB_URI` apontando pro cluster
   do monorepo de prod.
3. **URI do banco legacy** em mãos — pode estar no mesmo cluster ou em
   cluster separado.

---

## Passo 1 — Renomear coleções do legacy

Isola `users`, `classes`, `exams`, `students`, `results`, `scanresults`
e `integrations` do legacy em `legacy_*` pra evitar colisão com as
coleções do monorepo (3 delas — `classes`/`exams`/`students` — têm o
mesmo nome).

### Dry-run primeiro (zero risco)

Se legacy e monorepo estão **no mesmo cluster**:

```bash
pnpm --filter @lucida/api run migrate:legacy-rename
```

Se legacy está em **cluster separado** (caso prod):

```bash
pnpm --filter @lucida/api run migrate:legacy-rename \
  --uri="mongodb+srv://user:pass@legacy-prod.mongodb.net/<db>"
```

Confira o `plan` no output:
- `rename`: vai renomear
- `skip-missing`: source não existe (ignorar)
- `skip-conflict`: target `legacy_*` já existe — **investigar manualmente**

### Aplicar

Adiciona `--apply`:

```bash
pnpm --filter @lucida/api run migrate:legacy-rename --apply
# ou, com URI separada:
pnpm --filter @lucida/api run migrate:legacy-rename --uri="..." --apply
```

`renameCollection` do Mongo é atômico e instantâneo (só muda metadado,
não move docs).

### Se der ruim — rollback

```bash
pnpm --filter @lucida/api run migrate:legacy-rename --rollback --apply
```

---

## Passo 2 — Dry-run da migração

Valida o que seria escrito sem tocar nada.

Mesmo cluster:

```bash
pnpm --filter @lucida/api run migrate:legacy --dry-run
```

Clusters separados:

```bash
pnpm --filter @lucida/api run migrate:legacy \
  --dry-run \
  --legacy-uri="mongodb+srv://user:pass@legacy-prod.mongodb.net/<db>"
```

Observe o `sanity` report no stdout + o summary no stderr no final.
Os `legacyCounts` devem bater com o que você espera do legacy.

---

## Passo 3 — Smoke test

Roda real, mas limita a poucos registros pra validar.

```bash
pnpm --filter @lucida/api run migrate:legacy --entity=users --limit=10
```

Rode **duas vezes seguidas** o mesmo comando: a 2ª execução deve marcar
todos como `skip` com razão `"already migrated (by legacyClerkId)"` —
isso confirma que a idempotência está funcionando.

---

## Passo 4 — Filtrar escopo (opcional)

Pra migrar apenas um subset de users (ex: só pagantes):

```bash
# lista os Clerk IDs que você quer
pnpm --filter @lucida/api run migrate:legacy \
  --user-ids=user_abc123,user_def456,user_ghi789
```

Todas as fases vão filtrar por esses IDs (direta ou indiretamente via
`ownerId`).

---

## Passo 5 — Migração completa

```bash
pnpm --filter @lucida/api run migrate:legacy
# ou, com URI separada:
pnpm --filter @lucida/api run migrate:legacy --legacy-uri="..."
```

Ordem das fases (automática): `users → classes → students → exams →
submissions → scans`. Submissions cria Students automaticamente a partir
do `email` dos Results sem correspondência — regra "não perder nada do
histórico".

Stdout traz um log JSON por registro. Stderr traz o summary com counts
por fase e o `sanity` report no final.

---

## Passo 6 — Conferência pós-migração

O summary inclui um bloco `sanity` com:
- Counts de `legacy_*` vs. target (devem bater, considerando os dados
  preexistentes do monorepo)
- 3 contadores de órfãos:
  - `examsWithoutUser`: exams com `ownerId` não-existente em `user`
  - `submissionsWithoutStudent`: submissions com `studentId` não-existente
  - `scansWithoutExam`: scans apontando pra exam inexistente

Alguns exams "sem user" são esperados em QA (ruído preexistente). Em
prod, qualquer órfão merece investigação antes de declarar vitória.

Conferências manuais recomendadas:
- Pegar 5 users aleatórios e abrir o dashboard no app logado como cada um
- Confirmar que classes/exams/submissions aparecem
- Verificar uma prova de cada user — questões, gabarito, submissões

---

## Observações importantes

### Users sem email real

Users que tinham só `username` no Clerk (sem email verificado) recebem
email sintético `@legacy.lucida.invalid` e flag `needsEmailUpdate: true`
no doc do BA.

**Esses users não conseguem logar** até o email ser atualizado pra um
real. Pra achar quem é:

```js
// no Mongo shell ou Compass
db.user.find({ needsEmailUpdate: true }, { legacyClerkId: 1, legacyUsername: 1 })
```

Hoje a atualização é manual (direto no Mongo). Se o volume for alto em
prod, a gente constrói um endpoint admin.

### Billing não foi migrado

`credit_wallets`, `credit_ledger` e `subscriptions` continuam vazios pros
users migrados — decisão intencional. Se precisar dar welcome credits
retroativo, é um script adicional pequeno (me avise).

### Rerun é seguro

Todo o pipeline é idempotente por `legacyClerkId` (users) e pelo `_id`
legacy (demais). Rodar o comando completo 2x não duplica nada.

### Integrat / partner tokens

Feature não foi portada pro monorepo. A coleção `legacy_integrations` +
`integratPartnerToken` dos users legacy ficam intocados no banco.

---

## Rollback total (emergência)

Se algo foi escrito errado e você quer **voltar o monorepo ao estado
pré-migração**, restaure do `mongodump` do Passo 0 e rode o rollback do
rename:

```bash
# 1. restore do backup
mongorestore --nsInclude='<db>.user' --nsInclude='<db>.classes' ... dump/

# 2. volta as coleções legacy
pnpm --filter @lucida/api run migrate:legacy-rename --rollback --apply
```

---

## Resumo do fluxo (cheat sheet)

```bash
# dry-runs primeiro
pnpm --filter @lucida/api run migrate:legacy-rename --uri="..."
pnpm --filter @lucida/api run migrate:legacy --dry-run --legacy-uri="..."

# aplicar
pnpm --filter @lucida/api run migrate:legacy-rename --uri="..." --apply
pnpm --filter @lucida/api run migrate:legacy --legacy-uri="..." --entity=users --limit=10
pnpm --filter @lucida/api run migrate:legacy --legacy-uri="..."

# rollback se precisar
pnpm --filter @lucida/api run migrate:legacy-rename --uri="..." --rollback --apply
```
