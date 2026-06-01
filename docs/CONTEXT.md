# Lucida — Briefing de Contexto

> Documento de contexto para assistentes de chat (produto, negócio, marketing e
> estratégia). **Não** é documentação técnica. Última revisão: maio/2026 (rev. 2 —
> Apresentações em beta, questões abertas + correção por IA, provas multi-idioma).

---

## 1. Visão geral

A **Lucida** é uma plataforma SaaS de IA para **professores brasileiros** — "o cinto
de utilidades do professor". Resolve o problema de o professor gastar horas toda semana
montando material do zero em ferramentas espalhadas (Word, PowerPoint, e-mail, busca no
Google): provas, slides, planos de aula e correção. A Lucida reúne tudo num painel só —
da elaboração do material à análise dos resultados. Estágio **pre-seed**.

**Proposta de valor:** o professor cola um texto ou anexa um PDF, escolhe o que quer, e
em minutos tem o material pronto — com correção automática (online **e** em papel) e
análise de desempenho. Alunos, provas e correções são ilimitados; **paga-se apenas pelos
créditos que a IA consome**.

---

## 2. Produtos (a suíte)

Três produtos sob a mesma conta/plataforma:

| Produto | O que faz |
|---|---|
| **Lucida Exam** (azul `#007AFF`) | Geração de provas, listas e simulados a partir do material do professor. Escolhe disciplina, série e estilo de questão; a IA monta. Suporta **questões objetivas e abertas (dissertativas)**, com **correção das abertas por IA** (rubrica + revisão/aprovação do professor). Provas em **português, inglês e espanhol**. Correção automática online e em papel (OMR — leitura de folha de respostas). Banco de questões reutilizável. |
| **Lucida Learning** (planejamento) | Planos de aula alinhados à **BNCC**, sequências didáticas e **apresentações (slides) geradas por IA** a partir do plano de aula ou de material. Os slides têm editor (reordenar, trocar imagens), export para **PPTX/PDF** e modo apresentação. **Em beta:** a geração de slides ("Apresentações") já está no ar; segue calibrando preço e qualidade. |
| **Lucida Analytics** (roxo `#6C3CFB`) | Acompanhamento de desempenho por turma e aluno, lacunas de aprendizagem por habilidade, decisões baseadas em dados. Tem visão **institucional** (coordenadores/diretores) com créditos compartilhados. |

A IA da plataforma é personificada como **"Lulu"** (a assistente que "monta tudo").

### Monetização — créditos + assinatura

Modelo **por créditos**: cada ação de IA debita créditos (não cobra por aluno nem por
prova). O custo varia com a complexidade da questão (uma "simples" custa menos que uma
"contextual"). Tiers atuais (mensal):

| Plano | Preço | Créditos | Foco |
|---|---|---|---|
| **Básico** | R$ 49,90/mês | 5.000/mês | Quem está começando a automatizar |
| **Pro** (destaque) | R$ 99,90/mês | 15.000/mês | Quem dá aula em várias turmas; análises avançadas |
| **Instituição** | Sob consulta | Compartilhados | Escolas/redes; onboarding dedicado, NFS-e |

- Mensagem comercial: "planos simples, uso ilimitado"; alunos/provas/correções ilimitados.
- Plano **anual** está ativo na vitrine com **−20%** (créditos liberados na ativação,
  válidos por 12 meses). No mensal os créditos **não acumulam** — renovam a cada ciclo.
  [VERIFICAR] valores anuais exatos.
- **Pacotes avulsos de créditos** ainda não estão à venda ("em breve"); por ora, o caminho
  é upgrade de plano.
- Referência de consumo (FAQ): prova de 10 questões ≈ 700 créditos; regerar 1 questão ≈ 70;
  5.000 créditos ≈ ~7 provas/mês. Contextual consome mais que simples.
- Novos cadastros recebem **créditos de boas-vindas**. Pagamento via **Stripe** (exige
  `taxId` para criar o Customer e emitir NFS-e); PIX/top-up via AbacatePay.
- Contato institucional: **contato@lucidaexam.com**.

---

## 3. Stack & arquitetura (alto nível)

Tudo num **monorepo** (`lucida-monorepo`, pnpm workspaces) que substituiu quatro projetos
legados (`lucida-api-v2`, `lucida-api`, `lucida-client`/`lucida`, `lucida-lp`).

- **`apps/web`** — frontend **Next.js 15** (React 19, TypeScript, Tailwind). Abriga tudo:
  landing pública, app do professor (`/app`), painel institucional (`/analytics`),
  backoffice interno (`/kintal`), página pública de prova para o aluno (`/exam`) e docs
  da API pública.
- **`apps/api`** — backend **Express 5** + TypeScript + **MongoDB** (Mongoose), organizado
  por domínio (turmas, alunos, provas, billing, ai-ops, etc.).
- Frontend fala com o backend via rewrites; o aluno nunca acessa o backend direto.
- Há `packages/` reservado para código compartilhado (ainda vazio).

Integrações externas principais: **OpenAI** (geração e correção), **Stripe** (pagamentos),
**Resend** (e-mails), **NFE.io** (NFS-e), **Pexels** (imagens de stock nos slides), serviço
Python externo de **OMR** (correção de papel).

---

## 4. Decisões-chave já tomadas

- **Autenticação: Better Auth** (Google OAuth + e-mail/senha + plugin de organização).
  Substituiu o Clerk usado no legado — qualquer referência a Clerk é histórica.
- **Billing por créditos**, não por assento/aluno. Débito **atômico** com ledger; exige
  MongoDB com replica set. Decisão: alinhar custo ao consumo real de IA, não ao tamanho da
  turma.
- **Emissão fiscal: NFS-e via NFE.io**, disparada por transações de billing (mercado BR).
- **Terminologia de estilos de questão** (decisão de produto, exposta ao professor):
  - **Simples** — rápida e direta, objetiva, sem contexto.
  - **Contextual** — estilo ENEM; cada questão parte de um cenário curto (interpretação + aplicação).
  - **Analítica** — estilo ENADE; raciocínio em múltiplas etapas.
  - **Reflexiva** — aberta/metacognitiva; boa para textos, livros e material cultural.
- **Alinhamento curricular BNCC** nos planos de aula e na geração de prova.
- **Correção em papel além de online** (OMR) — decisão de atender a realidade da sala de
  aula brasileira, não só fluxo digital.
- **Multi-tenant/institucional** desde o desenho: professor individual (B2C) e escolas/redes
  (B2B) coexistem, com créditos compartilhados e painel institucional.
- **Monorepo único** como codebase canônico; os quatro projetos antigos viraram só referência.
- **Copy de UI sempre em pt-BR.**

---

## 5. Em aberto / em andamento

- **Apresentações (slides) em beta** — a geração já está no ar (a partir do plano de aula
  ou de material), com editor, export PPTX/PDF e modo apresentação. Preço (`slide-pricing`)
  ainda é **provisório**, em calibração. Imagens vêm do **Pexels** (stock); sem a chave, os
  slides caem pra tipografia/tema. [VERIFICAR] preço final e limites.
- **Questões abertas + correção por IA** — provas agora aceitam questões dissertativas;
  a IA corrige por rubrica e o professor revisa/aprova numa fila de correção. Consome
  créditos (precificação `grading`). Calibração de qualidade em andamento.
- **Provas em inglês e espanhol** — geração multi-idioma já disponível (output no idioma
  escolhido; instruções internas seguem em pt-BR).
- **Plano anual e pacotes de créditos avulsos** — existem no billing, mas a vitrine pública
  e os valores finais ainda não estão 100% definidos. [VERIFICAR]
- **API pública para parceiros** (`/v1/public/*`, com API keys e webhooks) e sua documentação
  — construída, maturidade comercial a confirmar. [VERIFICAR]
- **Roadmap público com voting** — canal de priorização com usuários, em uso.
- **Suporte por tickets via e-mail** (inbound) convivendo com formulário simples de ajuda.
- **`packages/` compartilhado** ainda não materializado (DTOs/schemas entre api e web).
- Métricas de tração (nº de professores, conversão, churn) não estão no repo — [VERIFICAR]
  com o fundador. (Material legado citava "3.000+ professores", não confirmado para a versão atual.)

---

## 6. Glossário

- **Lulu** — a assistente de IA da Lucida (personificação da geração).
- **Crédito** — unidade de consumo de IA; debitada por ação, varia com a complexidade.
- **Exam / Learning / Analytics** — os três produtos da suíte (provas / planejamento / análise).
- **Apresentações (slides)** — decks de slides gerados por IA dentro do Lucida Learning, a
  partir do plano de aula ou de material; com editor, export PPTX/PDF e modo apresentação.
- **Questão aberta / dissertativa** — questão sem alternativas, corrigida por IA via rubrica
  e revisada pelo professor (distinta da objetiva, corrigida por gabarito).
- **Rubrica** — critérios de correção de uma questão aberta; a IA pontua por critério.
- **OMR** — *Optical Mark Recognition*; leitura automática de folha de respostas em papel.
- **BNCC** — Base Nacional Comum Curricular; referência de habilidades nos planos/provas.
- **ENEM / ENADE** — exames brasileiros usados como referência de estilo de questão
  (contextual / analítica).
- **Turma / Curso** — turma é o grupo de alunos; curso agrupa turmas e provas de um professor.
- **Organização / Instituição** — conta institucional (escola/rede) com vários professores,
  créditos compartilhados e admin próprio.
- **Kintal** — backoffice interno da equipe Lucida (staff-only): dashboard, usuários, créditos.
- **Auxiliar** — atendente/assistente que atua em nome de um professor supervisionado.
- **NFS-e** — Nota Fiscal de Serviço eletrônica (emitida via NFE.io).
- **Ledger / débito atômico** — registro de movimentações de crédito com consistência transacional.
- **Welcome credits** — créditos concedidos no cadastro.
