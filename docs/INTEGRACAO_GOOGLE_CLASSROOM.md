# Integração Google Classroom — Setup no Google Cloud Console

> **Pré-requisito de execução.** A Lucida ainda **não tem projeto GCP**. Sem o
> setup abaixo + as variáveis de ambiente, o card do Google Classroom aparece
> como indisponível e qualquer tentativa de conectar devolve `503` — o resto da
> Lucida segue funcionando (degradação graciosa, igual a Stripe/OMR).

Esta integração usa um **fluxo OAuth próprio**, separado do login Better Auth.
O token de login do Google **não é reaproveitado** — o professor autoriza os
escopos do Classroom num consentimento à parte, e guardamos o `refresh_token`
(cifrado) pra renovar o acesso automaticamente.

---

## 1. Criar o projeto

1. Acesse <https://console.cloud.google.com/>.
2. Topo da página → seletor de projeto → **New Project**.
3. Nome sugerido: `lucida-classroom`. Anote o **Project ID**.

## 2. Habilitar a Google Classroom API

1. Menu → **APIs & Services → Library**.
2. Busque por **Google Classroom API** → **Enable**.

## 3. Tela de consentimento OAuth (OAuth consent screen)

1. **APIs & Services → OAuth consent screen**.
2. **User Type: External** (professores usam contas Google quaisquer / Workspace).
3. Branding:
   - **App name:** Lucida
   - **User support email:** contato@lucidaexam.com
   - **App logo:** (opcional, mas recomendado pra verificação)
   - **Application home page:** https://lucidaexam.com
   - **Privacy policy:** https://lucidaexam.com/privacidade
   - **Terms of service:** https://lucidaexam.com/termos
   - **Authorized domains:** `lucidaexam.com`
4. **Scopes** — adicione exatamente (FASE 1, todos *sensitive*):
   - `https://www.googleapis.com/auth/classroom.courses.readonly`
   - `https://www.googleapis.com/auth/classroom.rosters.readonly`
   - `https://www.googleapis.com/auth/classroom.profile.emails`
5. **Test users:** adicione os e-mails que vão testar antes da verificação
   (limite de **100** usuários enquanto o app está *unverified*).

> **Escopos futuros (Fases 2 e 3 — NÃO adicionar agora):** o envio da prova e o
> passback de nota vão exigir escopos de **escrita**:
> `https://www.googleapis.com/auth/classroom.coursework.students` e
> `https://www.googleapis.com/auth/classroom.coursework.me`. Quando abrirmos
> essas fases, eles entram aqui e disparam nova rodada de verificação.

## 4. Criar o OAuth client (Web application)

1. **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
2. **Application type: Web application**. Nome: `lucida-classroom-web`.
3. **Authorized redirect URIs** — adicione o callback da API (não do front):
   - Produção: `https://api.lucidaexam.com/v1/integrations/classroom/oauth/callback`
     *(use o host real de `AUTH_BASE_URL`)*
   - Dev local: `http://localhost:3333/v1/integrations/classroom/oauth/callback`
4. **Create** → copie o **Client ID** e o **Client secret**.

> O `redirect_uri` é, por padrão, `${AUTH_BASE_URL}/v1/integrations/classroom/oauth/callback`.
> Se a API rodar em outro host, ajuste tanto aqui quanto em `CLASSROOM_OAUTH_REDIRECT_URI`.

## 5. OAuth verification (escopos sensíveis)

Os três escopos da Fase 1 são **sensitive** → o Google exige **verificação** pra
publicar (sair do modo *Testing*). Enquanto *unverified*:

- só os **test users** cadastrados conseguem conectar (≤ 100);
- a tela de consentimento mostra aviso de "app não verificado".

Para publicar (processo leva **de dias a semanas**), prepare:
- Política de privacidade e termos públicos (já temos `/privacidade` e `/termos`).
- **Vídeo demo** mostrando o fluxo OAuth e o uso de cada escopo.
- Justificativa de uso de cada escopo (por que readonly de courses/rosters/emails).
- Domínio (`lucidaexam.com`) verificado no **Google Search Console**.

Submeta em **OAuth consent screen → Publishing status → Publish app → Prepare for verification**.

---

## 6. Variáveis de ambiente (apps/api)

Adicione ao `.env` da API (já documentadas em `apps/api/.env.example` e
validadas em `apps/api/src/env.ts`):

```bash
# OAuth client criado no passo 4
CLASSROOM_OAUTH_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
CLASSROOM_OAUTH_CLIENT_SECRET=GOCSPX-xxxxxxxx

# Opcional — só pra sobrescrever o default (${AUTH_BASE_URL}/v1/integrations/classroom/oauth/callback)
CLASSROOM_OAUTH_REDIRECT_URI=

# Chave AES-256-GCM pra cifrar access/refresh token em repouso (≥ 32 chars)
# Gerar com:
#   openssl rand -base64 32
CLASSROOM_TOKEN_ENC_KEY=
```

As três (client id + secret + enc key) precisam estar presentes pra integração
ligar. Faltando qualquer uma, o backend injeta stubs e o card fica indisponível.

---

## 7. Migration / backfill

Depois de subir o código (que adiciona `classroomCourseId` na turma,
`courseWorkId` na prova e os campos de classroom no aluno), rode o backfill pra
normalizar os documentos antigos:

```bash
pnpm --filter @lucida/api run backfill:classroom-fields --dry-run   # confere
pnpm --filter @lucida/api run backfill:classroom-fields             # aplica
```

---

## 8. Teste fim-a-fim (dev)

1. Suba `pnpm dev` com as três envs setadas e seu e-mail nos *test users*.
2. `/app/integracoes` → card Google Classroom → **Conectar** → consinta no Google.
3. Volta em `?classroom=connected`, o card mostra sua conta.
4. **Gerenciar turmas** → importe uma turma escolhendo/criando um Curso.
5. Rerode **Importar alunos do Classroom** → resumo deve dizer "0 importados,
   N já existiam" (idempotência). Remova um aluno no Classroom e reconcilie →
   ele é marcado como saído, **não** apagado.
