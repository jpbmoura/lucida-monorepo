# Migração Clerk → BetterAuth

Este documento descreve o plano para migrar usuários do Clerk (em produção hoje,
servindo `app.lucidaexam.com`) para BetterAuth (rodando em `apps/api` neste
monorepo). **Ainda não executado.** É um plano pra referência no dia do cutover.

## Princípios

1. **Zero perda de dados de negócio.** Provas, turmas, submissões e histórico
   seguem ligados aos mesmos usuários após a migração.
2. **Preservar o `userId` como chave.** Hoje `User.id` em Mongo = `user_XXXX` do
   Clerk. BA aceita `id` custom — vamos criar cada `user` no BA com o ID original.
   Todas as FKs existentes em `Exam`, `Class`, `Student`, `Result`, `ScanResult`
   continuam apontando pra pessoa certa.
3. **Senhas não podem ser migradas.** Clerk usa bcrypt + pepper interno não
   exportável. Usuários email+senha precisam resetar. Usuários sociais (Google)
   reautenticam em 1 clique.

## Collections envolvidas

### Hoje (com Clerk)

- `User` (lucida-api-v2 + lucida-client): `{ id: "user_XXX", email, username, subscription, usage, ... }`
- Collections de negócio com FK para `userId`: `Exam`, `Class`, `Student`, `Result`, `ScanResult`, etc.

### Depois (com BetterAuth)

BetterAuth cria suas próprias collections no mesmo DB:

- `user` — `{ id, email, emailVerified, name, image, createdAt, updatedAt }`
- `session` — `{ id, userId, expiresAt, token, ipAddress, userAgent }`
- `account` — `{ id, userId, providerId, accountId, accessToken, refreshToken, ... }`
  (uma linha por provider: `email-password`, `google`, etc.)
- `verification` — tokens de verificação de email e reset
- `organization`, `member`, `invitation` (do plugin `organization`)

A `User` legada vira **collection de domínio** com dados de negócio apenas
(subscription, usage, plano, role institucional). Faz join com `user.id` da BA.
Renomear para `user_profile` ou similar pra evitar colisão com a collection `user`
da BA. **Decisão de renomeação fica pra rodada de migração de billing.**

## Dados que precisam sair do Clerk

Exportar via Clerk Backend API (`@clerk/backend`, `clerkClient.users.getUserList()`):

| Campo Clerk | Destino |
|---|---|
| `id` | `user.id` (BA, como `id` explícito) |
| `primaryEmailAddress.emailAddress` | `user.email` |
| `primaryEmailAddress.verification.status === "verified"` | `user.emailVerified` |
| `firstName + lastName` ou `username` | `user.name` |
| `imageUrl` | `user.image` |
| `createdAt` | `user.createdAt` |
| Google `externalAccounts[]` com `provider === "oauth_google"` | `account` com `providerId: "google"`, `accountId: externalAccount.providerUserId` |
| `publicMetadata`, `privateMetadata` | decidir caso a caso — se houver info de plano/subscription, vai pra collection de domínio, não pra BA |

## Roteiro do script de migração

Arquivo sugerido: `apps/api/scripts/migrate-clerk-to-better-auth.ts`

```ts
// Pseudocódigo
import { clerkClient } from "@clerk/backend";
import { getAuthDb } from "@/domains/iam/infrastructure/better-auth/mongo-client.js";
import { createAuth } from "@/domains/iam/infrastructure/better-auth/auth.js";

const db = await getAuthDb(env.MONGODB_URI);
const auth = createAuth(db);

let offset = 0;
const pageSize = 100;

while (true) {
  const page = await clerkClient.users.getUserList({ limit: pageSize, offset });
  if (page.data.length === 0) break;

  for (const clerkUser of page.data) {
    // 1. Insere user na BA preservando o ID
    await db.collection("user").insertOne({
      id: clerkUser.id,                              // "user_XXX"
      email: clerkUser.primaryEmailAddress!.emailAddress,
      emailVerified: clerkUser.primaryEmailAddress!.verification?.status === "verified",
      name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || clerkUser.username,
      image: clerkUser.imageUrl,
      createdAt: new Date(clerkUser.createdAt),
      updatedAt: new Date(),
    });

    // 2. Para cada Google linkado, cria uma account na BA
    const google = clerkUser.externalAccounts.find(a => a.provider === "oauth_google");
    if (google) {
      await db.collection("account").insertOne({
        id: crypto.randomUUID(),
        userId: clerkUser.id,
        providerId: "google",
        accountId: google.providerUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // 3. Se o usuário tinha email+senha no Clerk, dispara email de reset
    const hadPassword = clerkUser.passwordEnabled;
    if (hadPassword) {
      await auth.api.forgetPassword({
        body: {
          email: clerkUser.primaryEmailAddress!.emailAddress,
          redirectTo: "/reset-password",
        },
      });
    }
  }

  offset += pageSize;
}
```

### Validação pós-migração

- Contar `db.user` e comparar com total do Clerk: números devem bater.
- Spot-check em 10 usuários random: `user.id` do BA tem que corresponder a um doc
  existente em collections de negócio (`Exam`, `Class`, etc.).
- Testar login email+senha em uma conta de teste (após reset).
- Testar login Google em uma conta com account record criado.

## Dia do cutover — checklist

1. **D-7 a D-3**: envio de email avisando "vamos atualizar o login no dia X.
   Prepare-se para redefinir sua senha (senhas não) ou reentrar com Google
   (1 clique)."
2. **D-1**: dry-run do script em staging/DB clonado. Validar.
3. **Dia D — janela de manutenção** (escolher domingo à noite / baixa utilização):
   - [ ] Subir página de manutenção em `app.lucidaexam.com` (mantém lp no ar)
   - [ ] Parar serviços: `lucida-client`, `lucida-api-v2`
   - [ ] Dump completo do Mongo (backup)
   - [ ] Rodar `pnpm tsx apps/api/scripts/migrate-clerk-to-better-auth.ts`
   - [ ] Disparar reset de senha em lote (feito pelo próprio script)
   - [ ] Deploy `apps/api` (com BetterAuth) e `apps/web` (novo monorepo)
   - [ ] Apontar DNS `app.lucidaexam.com` → novo `apps/web`
   - [ ] Apontar DNS `api.lucidaexam.com` → novo `apps/api` (ou usar o mesmo via proxy)
   - [ ] Smoke-test: criar conta nova, logar Google, logar email+senha (conta teste)
   - [ ] Derrubar página de manutenção
4. **D+1 a D+7**: monitorar suporte. Usuários que não reentraram recebem lembrete
   por email. Após 30 dias, congelar contas não reativadas.

## Rollback

- Se der problema no dia D: DNS volta pros serviços antigos (Clerk continua
  operante, o script não apaga nada do Clerk). Backup do Mongo permite voltar o
  estado exato caso o script tenha corrompido algo.
- Antes do cutover, Clerk permanece 100% funcional. O novo monorepo pode rodar em
  paralelo num domínio staging (`staging.lucidaexam.com`) pra testar tudo.

## Fora de escopo agora

- **Migração lazy (dual-run)**: manter Clerk + BA em paralelo por semanas,
  validando senha via Clerk num proxy até todos migrarem. Só faz sentido se a
  base ativa for muito grande — reavaliar na véspera.
- **Two-factor**: Clerk pode ter 2FA ligado em algumas contas. Essa info não é
  exportável e o usuário vai precisar reconfigurar na BA (plugin `twoFactor`).
- **Organizações**: Se houver orgs/times no Clerk, precisa de um passo separado
  pra recriar via plugin `organization` da BA com o mesmo mapping de membership.
  Não temos orgs em produção hoje, então inicial é greenfield.
