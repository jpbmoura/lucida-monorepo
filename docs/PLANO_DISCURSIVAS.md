# Plano de Implementação — Questões Discursivas (geração com rubrica + correção manual e por IA)

> Status: **PLANO** (nenhum código escrito ainda). Onde há incerteza, está marcado como
> **pergunta em aberto** em vez de assumido.
> Investigação do código real feita em 2026-05-30 sobre o monorepo (`apps/api`, `apps/web`).

---

## Passo 0 — O estado atual (o que realmente existe vs. o que você descreveu)

### Divergências críticas (leia antes de tudo)

1. **"Reflexiva" NÃO é discursiva.** É um *estilo de prompt* de geração de questões
   **objetivas** (múltipla escolha), definido em
   [reflective.ts](apps/api/src/domains/ai-ops/infrastructure/openai/prompts/styles/reflective.ts).
   Os 4 estilos (`simple`, `contextual`, `analytical`, `reflective`) **todos** produzem
   múltipla escolha ou V/F. Nenhum produz texto aberto.

2. **Não existe tipo de questão discursiva renderável/respondível hoje.** O tipo é
   `QuestionType = "multipleChoice" | "trueFalse"`
   ([question.ts:3](apps/api/src/domains/exam/domain/question.ts#L3)). Não há campo de texto
   livre em lugar nenhum: nem no domínio, nem no schema, nem na página pública, nem no submit.

3. **Resposta do aluno é só índice de alternativa.** `answers: Array<number | null>`
   ([submission.ts:47](apps/api/src/domains/submission/domain/submission.ts#L47)). Sem texto.
   O submit público valida `z.array(z.number().int().nonnegative().nullable())`
   ([submission-schemas.ts:35](apps/api/src/domains/submission/presentation/submission-schemas.ts#L35)).

4. **Nota é 100% automática e sem pesos.** `score = round((acertos / total) * 100) / 10`
   ([submission.ts:138](apps/api/src/domains/submission/domain/submission.ts#L138)). Toda
   questão vale 1 ponto; nota máxima 10 hardcoded. **Não existe peso/pontos por questão.**
   **DECIDIDO (fundador):** a fórmula **não muda**; pesos seguem iguais (1 por questão); a
   aberta contribui uma **fração** ∈ [0,1] vinda da rubrica (crédito parcial). Ver §1.2/§3.

5. **Não existe correção manual hoje.** O schema do `scan` tem `corrections[]`, `reviewedBy`,
   `reviewNotes` como **resíduo legacy sem caminho de escrita**
   ([scan-schema.ts:32](apps/api/src/domains/scan/infrastructure/scan-schema.ts#L32)). O único
   "review" real é aprovar/rejeitar um scan OMR antes de virar submission — não é correção de
   resposta. Submission é **imutável** depois de `submitted`.

6. **Pricing de IA é TABELADO e determinístico, não por token.**
   `priceExam = BASE_CREDITS(250) + PER_QUESTION[style] * count`
   ([exam-pricing.ts](apps/api/src/domains/ai-ops/domain/exam-pricing.ts)). `estimate-credits.ts`
   (token-based) é **só telemetria no ledger**, não cobra o professor. Isso tem implicação direta
   pro pricing da correção (ver §4).

7. **`regenerate-question` é um use case, não um "módulo compartilhado".** Os módulos
   compartilhados reais são: `injection-defense`, `output-contract`, `golden-rules`,
   `distractor-discipline`, `persona`, `math-notation`, `bloom-calibration`, `language`.
   `answer-explanation-verifier` existe como verificador opt-in (telemetria R2).

### O que está sólido e dá pra reaproveitar (confirmado)

- **`injection-defense` + nonce markers** ([injection-defense.ts](apps/api/src/domains/ai-ops/infrastructure/openai/prompts/shared/injection-defense.ts)):
  material do professor já entra como dado não-confiável em `<<<MATERIAL:nonce>>> … <<<FIM_MATERIAL:nonce>>>`.
  **Exatamente o padrão que a resposta do aluno (entrada não-confiável) precisa na correção.**
- **`output-contract` + Structured Outputs** (`zodResponseFormat`): contrato de saída estruturada
  forçado por schema strict. Replicável pra rubrica e pra avaliação.
- **SSE com heartbeat** ([ai-controller.ts](apps/api/src/domains/ai-ops/presentation/ai-controller.ts)
  + [sse-client.ts](apps/web/src/features/app/provas/sse-client.ts)): geração streama `progress`/`result`.
  Reaproveitável pra correção em lote.
- **Estimativa antes da ação**: `POST /v1/ai/estimate` → `priceExam()` puro, sem débito; o
  frontend mostra no [generate-confirm-dialog.tsx](apps/web/src/features/app/billing/components/generate-confirm-dialog.tsx)
  com contexto "pago pela instituição". Mesmo fluxo serve pro "corrigir tudo".
- **Débito atômico + ledger** ([atomic-debit-service.ts](apps/api/src/domains/billing/infrastructure/atomic-debit-service.ts),
  [billing-service.ts](apps/api/src/domains/billing/application/billing-service.ts)):
  `ensureSufficientBalance` → `debit({ reason: "ai_consumption", relatedAction, … })`, com
  roteamento user/org via [billing-target-resolver.ts](apps/api/src/domains/billing/application/billing-target-resolver.ts).
  Correção por IA pluga aqui sem inventar nada novo no core de billing.
- **Editor de verificação de questão** ([question-editor.tsx](apps/web/src/features/app/provas/components/question-editor.tsx)
  + [step-review.tsx](apps/web/src/features/app/provas/steps/step-review.tsx)): card editável +
  `StudentPreview` lado a lado + Zustand store. É o molde do editor de rubrica.

### Premissas a confirmar (viram perguntas ao fundador — ver §9)

**Todas RESOLVIDAS pelo fundador (2026-05-30):**
- ~~P-A~~ **Nota:** fórmula inalterada; aberta contribui fração ∈ [0,1] da rubrica. Professor pode
  **sobrepor** a fração final além de ajustar níveis. Ver §1.2/§3.
- ~~P-B~~ **Visibilidade:** mesma regra da explicação das objetivas — **se o aluno vê a explicação
  da objetiva, ele vê a rubrica + feedback da aberta** (no resultado, após a correção). Ver §2.6.
- ~~P-C~~ **Tamanho da resposta:** **sem limite** na v1 (risco futuro aceito conscientemente).
- ~~P-D~~ **Quem dispara correção/ações de IA:** **sempre o professor** (dono da prova). Sem papel
  extra; em pool institucional o professor dispara e a estimativa é exibida. Ver §4.
- ~~P-E~~ **Input da correção:** **enunciado + rubrica + resposta-modelo + resposta do aluno**,
  **SEM material-fonte**. Logo a rubrica precisa ser bem feita — ela é o gabarito da IA. Ver §2.3/§4.

---

## 1. Conceito central de domínio: Rubrica + Questão Aberta

### 1.1 Rubrica (novo Value Object, domínio `exam`)

Rubrica = **CRITÉRIOS × NÍVEIS**. A IA escolhe só o **nível** por critério; a nota é **somada**
em código a partir dos pontos do nível escolhido (nunca um número holístico). Isso é a restrição
inegociável #1 do briefing.

```
Rubric
  criteria: Criterion[]            // ≥ 1

Criterion
  id: string                       // estável; referenciado na correção
  name: string                     // ex. "Uso correto de conceitos"
  description: string | null
  levels: Level[]                  // ≥ 2, ordenados por points asc

Level
  id: string                       // estável; é o que a IA devolve
  label: string                    // ex. "Insuficiente" / "Parcial" / "Completo"
  points: number                   // ≥ 0
  descriptor: string               // o que caracteriza esse nível
```

- `Rubric.maxPoints()` = Σ critério `max(level.points)`.
- `Rubric.scoreFor(selections: Map<criterionId, levelId>)` = Σ pontos dos níveis escolhidos.
- IDs estáveis (`id`) sobrevivem à edição do professor — a correção referencia por id, não por
  posição. **Ponto de extensão (Fase 2 calibração):** a rubrica é a âncora; exemplos corrigidos
  apontam pra ela por id.

### 1.2 Questão aberta (extensão do VO `Question`)

`QuestionType` ganha `"open"`. A `Question` vira efetivamente um **union por tipo**:

- **Objetiva** (`multipleChoice`/`trueFalse`): como hoje — `options`, `correctAnswer`,
  `explanation`. `rubric = null`.
- **Aberta** (`open`): `options = []`, `correctAnswer` não se aplica; ganha
  `rubric: Rubric`, `referenceAnswer: string | null` (resposta-modelo, opcional), e
  `maxPoints` derivado da rubrica. `explanation` pode virar comentário pedagógico geral.

Validação no domínio: questão `open` **exige** rubrica válida e **proíbe** options/correctAnswer;
objetiva **exige** options/correctAnswer e **proíbe** rubrica. (Mesma disciplina de validação por
tipo que já existe em [question.ts:61](apps/api/src/domains/exam/domain/question.ts#L61).)

**Composição da nota (DECIDIDO pelo fundador):** a fórmula não muda —
`score = earned / questionCount * 10`, com **todas as questões pesando igual (1)**. A única
diferença: objetiva contribui `0` ou `1`; **aberta contribui uma fração** =
`rubric.scoreFor(seleções) / rubric.maxPoints()`, em `[0,1]` (crédito parcial — ex.: questão
"vale 1", aluno obtém 6 de 10 na rubrica ⇒ contribui `0.6`). Logo `earned` (soma das
contribuições) passa a ser fracionário, mas **denominador (`questionCount`) e normalização a 10
são idênticos a hoje**. Sem `points` customizado por questão na v1 (peso diferenciado = extensão
futura). Isso **honra a restrição #1** (nota somada/calculada da rubrica, nunca holística) e o
crédito parcial pedido — e dissolve a necessidade de qualquer "corte binário".

---

## 2. Mudanças por feature × camada

### 2.1 `exam` (modela a prova, a questão e agora a rubrica)

**domain**
- `domain/rubric.ts` *(novo)* — VOs `Rubric`/`Criterion`/`Level` + `maxPoints()`/`scoreFor()` +
  validação (≥1 critério, ≥2 níveis, pontos ≥0).
- `domain/question.ts` — adiciona `"open"` ao `QuestionType`; campos `rubric`, `referenceAnswer`;
  validação por tipo; método `maxPoints()`.
- `domain/exam.ts` — helpers `hasOpenQuestions()`, `totalMaxPoints()`; `replaceQuestions` passa a
  aceitar abertas. Sem mudança estrutural grande.

**application**
- `create-exam.ts` / `update-exam.ts` — mapear `rubric`/`referenceAnswer` na construção das
  `Question`. Lógica de ownership intacta.
- `get-exam.ts` / `export-exam-docx.ts` — serializar rubrica; DOCX renderiza enunciado aberto +
  (opcional) linhas pra resposta; gabarito mostra rubrica/resposta-modelo.

**infrastructure**
- `exam-schema.ts` — `questionSchema`: `type` enum ganha `"open"`; `options`/`correctAnswer`
  viram opcionais; subdocumentos `rubric { criteria[{ id, name, description, levels[{ id, label,
  points, descriptor }] }] }` e `referenceAnswer`.
- `docx-exam-builder.ts` — branch de render pra questão aberta.

**presentation**
- `exam-schemas.ts` — Zod: `questionSchema` vira discriminated union por `type`; schema da rubrica;
  `refine` garantindo coerência (aberta⇒rubrica, objetiva⇒options).

### 2.2 `submission` (resposta do aluno + correção das abertas)

**domain**
- `domain/submission.ts`:
  - Armazenar resposta de texto. **Proposta:** array paralelo alinhado por índice de questão
    `textAnswers: Array<string | null>` (null onde a questão não é aberta), mantendo `answers`
    (índices) intacto pra não quebrar OMR/objetivas e submissions existentes.
    *(Alternativa mais limpa, porém migração maior: `responses: Array<{kind:"choice",value} |
    {kind:"text",value}>`. Marcado como decisão.)*
  - Novo VO `OpenGrade` (ou `domain/open-grade.ts`):
    ```
    OpenGrade
      questionIndex: number
      criteria: Array<{ criterionId, levelId, points, justification, feedback }>
      totalPoints: number          // = Σ points (auditável)
      maxPoints: number
      source: "manual" | "ai"
      status: "ai_suggested" | "approved"   // human-in-the-loop
      gradedByUserId: string | null
      aiModel: string | null
      gradedAt: Date
    ```
  - `gradingStatus: "not_required" | "pending" | "partially_graded" | "graded"` (campo novo,
    **separado** do `status` atual pra não quebrar fluxo objetivo).
  - Recomposição de nota (modelo decidido): contribuição por questão = objetiva `0|1`; aberta
    `clamp(rubricObtido / rubricMáx, 0..1)` — **crédito parcial**. `earned = Σ contribuições`
    (agora fracionário); `score = round(earned / questionCount * 100) / 10` (fórmula inalterada).
    Enquanto há abertas pendentes, exibir nota objetiva parcial + selo "aguardando correção"; a
    nota só **fecha** quando todas as abertas estão `approved` (`gradingStatus = graded`).
  - **Nota de modelagem:** introduzir `earnedPoints: number` (float, Σ contribuições) como fonte
    do `score`. Manter `correctCount` como **inteiro** (questões com contribuição = 1, pra não
    quebrar o "X de Y acertos" da UI); a fração das abertas aparece no `score` e na tela de
    correção, não no `correctCount`.
- `domain/submission-errors.ts` — erros (corrigir questão não-aberta, nível inexistente na
  rubrica, aprovar com pendência, etc.).

**application** *(novos use cases — correção manual e aprovação ficam aqui; submission é dona da
nota do aluno)*
- `get-submission-for-grading.ts` *(novo)* — carrega submission + rubrica da prova + respostas
  abertas, pro professor corrigir.
- `grade-open-answer-manually.ts` *(novo)* — professor seta nível por critério + feedback +
  override; grava `OpenGrade` (source `manual`, status `approved`); recomputa nota.
- `save-ai-open-grades.ts` *(novo, port consumido pelo ai-ops)* — persiste drafts da IA
  (status `ai_suggested`) sem fechar a nota.
- `approve-open-grades.ts` *(novo)* — **aprovação em lote**; promove `ai_suggested → approved`
  (com edições do professor), recomputa e fecha nota; emite eventos.
- `submit-exam.ts` — passa a aceitar `textAnswers`; calcula só a parte objetiva; seta
  `gradingStatus = pending` se houver abertas, senão `not_required`/`graded`.

**infrastructure**
- `submission-schema.ts` — campos `textAnswers`, `openGrades[]` (subdoc do `OpenGrade`),
  `gradingStatus`. Índices pra listar "pendentes de correção" por prova.
- `mongoose-submission-repository.ts` — upsert por id já suporta mutação pós-submit; mapear novos
  campos.

**presentation**
- `submission-schemas.ts` — `submitExamBody` aceita `textAnswers`; schemas de correção manual e
  de aprovação em lote.
- `submission-controller.ts` / `submission-routes.ts` — rotas privadas (professor):
  `GET /v1/exams/:id/submissions/:sid/grading`, `POST …/grade-open` (manual),
  `POST /v1/exams/:id/grading/approve` (lote). Submit público estende o existente. **Novo público
  (P-B):** `GET /v1/public/exams/:shareId/result` (ou estender o begin "already_submitted") devolve
  o resultado do aluno incluindo, para abertas já corrigidas, rubrica + nível + feedback + fração —
  respeitando a mesma visibilidade da `explanation` objetiva.
- `application/get-public-result.ts` *(novo)* — monta o resultado visível ao aluno (objetivas +
  abertas corrigidas), sem expor rubrica de questão ainda não corrigida nem de outros alunos.

### 2.3 `ai-ops` (gerar discursiva+rubrica; corrigir contra rubrica)

**domain**
- `domain/generation-types.ts` — `questionTypes` ganha `open`; tipos `GeneratedOpenQuestion`
  (statement, context, referenceAnswer, rubric) e `GeneratedRubric`.
- `domain/exam-pricing.ts` — `PER_QUESTION` ganha entrada `open` (provável mais caro; valor a
  calibrar). `priceExam` continua determinístico.
- `domain/grading-pricing.ts` *(novo)* — pricing da **correção**. Diferente da geração: o custo
  varia com o tamanho da resposta (entrada real). Input por correção é **enunciado + rubrica +
  resposta-modelo + resposta do aluno** (sem material — P-E), então o termo dominante e variável é
  `answerChars`. Como as respostas **já estão no banco**, dá pra estimar consumo real:
  `priceGradeAnswer({ rubricSize, answerChars })` via heurística tokens≈chars + `TOKENS_PER_CREDIT`;
  `priceGradeBatch(answers[])` = Σ. Satisfaz a restrição #5 ("precificar contra consumo real") **e**
  mantém estimativa exibível antes da ação. *(Decisão técnica restante: token-estimado vs.
  tabelado-por-critério — proposta é token-estimado por já termos as respostas.)*

**application**
- `generate-exam-questions.ts` — quando `questionTypes.open`, roda uma rodada adicional com o
  contrato de rubrica e mescla as abertas no resultado; débito reflete `priceExam` com abertas.
- `estimate-grading.ts` *(novo)* — recebe `examId` (+ filtro de quais submissions), lê respostas
  abertas, devolve `{ estimatedCredits, perStudent[] }` sem debitar.
- `grade-open-answers.ts` *(novo)* — orquestra: carrega submission(s) + rubrica (via
  `ExamRepository`/`SubmissionRepository` ports), `ensureSufficientBalance`, chama o grader por
  resposta, **debita por resposta efetivamente corrigida** (`reason: "ai_consumption"`,
  `relatedAction: "grade_open_answer"`), e persiste drafts via `save-ai-open-grades`. Emite
  `onProgress` pra SSE. **Ponto de extensão (calibração):** aceita `anchors?: GradedExample[]`.

**infrastructure**
- `openai/prompts/shared/rubric-contract.ts` *(novo)* — output-contract da rubrica (criteria/levels)
  pra geração.
- `openai/prompts/open-question/guide.ts` *(novo)* — guia de geração de questão aberta + rubrica
  (reusa PERSONA, golden-rules adaptado, INJECTION_DEFENSE, MATH_NOTATION, BLOOM_CALIBRATION).
  **Instrução-chave (P-E):** a rubrica precisa ser **autossuficiente** — descritores de nível
  concretos e observáveis, porque na correção a IA só terá enunciado + rubrica + resposta-modelo +
  resposta do aluno (sem o material). Rubrica vaga = correção ruim.
- `openai/prompts/grading/system.ts` *(novo)* — prompt de correção contra rubrica. **Input
  (P-E): enunciado + rubrica + resposta-modelo + resposta do aluno — SEM material-fonte.**
  Restrições travadas no prompt **e** no schema:
  - resposta do aluno embrulhada em `INJECTION_DEFENSE` + nonce (entrada não-confiável, restrição #4);
  - IA devolve **por critério**: `levelId` (enum restrito aos níveis reais da rubrica) +
    `justification` curta + `feedback` ("fez bem / melhore"); **nunca** uma nota inventada;
  - nota é somada em código (restrição #1/#3); fração = pontos/máx (§3).
- `openai/open-question-generator.ts` *(novo ou extensão do existente)* — geração de abertas+rubrica
  via Structured Outputs.
- `openai/open-answer-grader.ts` *(novo)* — serviço de correção; `zodResponseFormat` com `levelId`
  constrito aos ids da rubrica daquela questão.

**presentation**
- `ai-schemas.ts` — `questionTypes.open`; schemas de `estimate-grading` e `grade-open-answers`.
- `ai-controller.ts` / `ai-routes.ts` — `POST /v1/ai/grading/estimate` (instantâneo, sem débito) e
  `POST /v1/ai/grading/run` (SSE: `progress` por aluno, `result` no fim).

### 2.4 `billing`

Mudança mínima — o core não muda. Pluga via `BillingService.debit`/`ensureSufficientBalance` já
existentes. Apenas novos valores de `relatedAction` (`"grade_open_answer"`). **Decisão:** novo
`LedgerReason` (`"ai_grading"`?) vs. reusar `"ai_consumption"` + `relatedAction`. Proposta: reusar
`"ai_consumption"` (evita migração de enum). Guardrails de pool institucional → ver P-D.

### 2.5 `scan` — fora do escopo v1

OMR não lê texto manuscrito (Fase 2/OCR). Garantir que prova com abertas ainda permita scan da
**parte objetiva**, com as abertas marcadas `pending` pra correção online. Sem mudança de código
em scan na v1 além de tolerar prova mista.

### 2.6 Frontend (`features/app/provas`, `features/public-exam`)

**Geração + verificação da rubrica (molde: `question-editor.tsx`)**
- `step-config.tsx` — opção de tipo "Discursiva" (com aviso: não corrigível por OMR).
- `components/rubric-editor.tsx` *(novo)* — editar critérios/níveis/pontos.
- `components/open-question-editor.tsx` *(novo)* — enunciado + resposta-modelo + `RubricEditor`,
  no mesmo padrão de card do editor objetivo. Professor verifica/edita a rubrica gerada.
- `components/student-preview.tsx` — render de aberta = textarea vazio (sem rubrica visível).
- `wizard-store.ts` / `types.ts` / `actions.ts` — suportar questão aberta + rubrica no estado e no
  `createExamAction`.

**Correção manual (tela nova)**
- `features/app/provas/grading/manual-grading.tsx` *(novo)* — abre a submission do aluno; por
  questão aberta mostra resposta + rubrica; professor escolhe nível por critério, edita feedback,
  vê pontos somados ao vivo, salva (`grade-open-answer-manually`).

**Correção por IA (primeira passada + aprovação em lote, molde: SSE da geração)**
- `features/app/provas/grading/ai-grading-review.tsx` *(novo)* — botão "Corrigir discursivas com
  IA" → `generate-confirm-dialog` reusado mostrando **estimativa** (de `POST /v1/ai/grading/estimate`)
  com contexto "pago pela instituição" → dispara `POST /v1/ai/grading/run` (SSE `progress`
  graded/total) → tabela de revisão: por aluno/critério mostra nível sugerido + justificativa +
  feedback editáveis → **"Aprovar em lote"** (`approve-open-grades`). Human-in-the-loop (restrição #2).
- `sse-client.ts` — reaproveitado como está (já genérico a `progress`/`result`).

**Aluno responde texto**
- `public-exam.tsx` / `components/exam-taking.tsx` — render `<textarea>` pra `open`; estado
  `textAnswers`; incluir no submit. **Sem limite de tamanho** (P-C).
- `features/public-exam/types.ts` — `PublicQuestionDTO.type` ganha `"open"`; **rubrica NÃO é
  enviada enquanto o aluno responde** (mesma regra do gabarito/`explanation` hoje), só no resultado.
- `components/result-screen.tsx` — **P-B: mesma regra da explicação da objetiva.** Aberta ainda
  não corrigida → "aguardando correção"; após corrigida+aprovada → mostra **rubrica + nível +
  feedback por critério + fração obtida** (o feedback é o valor entregue ao aluno). Como a correção
  é assíncrona ao submit, o aluno revisita pelo mesmo link (tela "já enviada") pra ver o resultado
  corrigido.

---

## 3. Schemas Mongoose (resumo do impacto)

| Coleção | Campo novo/alterado | Observação |
|---|---|---|
| `exams.questions[]` | `type` aceita `"open"`; `options`/`correctAnswer` opcionais; `rubric{criteria[{id,name,description,levels[{id,label,points,descriptor}]}]}`; `referenceAnswer` | Backward-compat: docs antigos têm `rubric` ausente/null |
| `submissions` | `textAnswers: (string\|null)[]`; `openGrades[]` (subdoc `OpenGrade`); `gradingStatus` | Submissions antigas → `gradingStatus` default `not_required` (lazy ou backfill) |
| `credit_ledger` | nenhum schema novo | só novos `relatedAction`; ledger é append-only |

**Composição da nota final (DECIDIDO):** fórmula inalterada — `score = earned/questionCount*10`,
pesos iguais. Objetiva contribui `0|1`; aberta contribui `rubricObtido/rubricMáx` ∈ [0,1] (crédito
parcial). `earned` vira float; `correctCount` segue inteiro (contribuição = 1). Nota só fecha
quando `gradingStatus = graded`; enquanto pendente, mostra parcial objetiva + selo "aguardando
correção". Sem migração do modelo de score nem pesos por questão.

---

## 4. Billing — caminho de estimativa + débito da correção

1. **Estimativa (sem débito):** `POST /v1/ai/grading/estimate` → `estimate-grading` lê as respostas
   abertas no banco → `grading-pricing.priceGradeBatch()` → `{ estimatedCredits, perStudent[] }`.
   Frontend mostra no dialog reusado **antes** do "corrigir tudo".
2. **Débito:** dentro de `grade-open-answers`, por resposta efetivamente corrigida →
   `BillingService.ensureSufficientBalance` (uma vez, com o total estimado) e `debit` (por resposta,
   `reason: "ai_consumption"`, `relatedAction: "grade_open_answer"`, `tokensUsed` real como
   telemetria). Débito atômico/ledger/roteamento user-org reaproveitados sem mudança.
3. **Por que per-resposta:** falha parcial não cobra o que não rodou; e correção é "N chamadas,
   1 por aluno" (restrição #5). **Decisão:** débito por-resposta vs. um débito de lote +
   estorno em falha. Proposta: por-resposta (mais simples e justo). Marcado.

---

## 5. Fluxos de frontend (resumo visual)

```
GERAÇÃO (professor)
 Config: tipo "Discursiva" → Gerar (SSE) → Review:
   OpenQuestionEditor [enunciado | resposta-modelo | RubricEditor(critérios×níveis)]
   StudentPreview: textarea vazio
 Salvar prova (rubrica viaja junto com a questão)

ALUNO
 /exam/[shareId]: textarea pra abertas → submit (textAnswers) → "aguardando correção"

CORREÇÃO MANUAL (professor)
 Submissão do aluno → por aberta: resposta + rubrica → escolhe nível/critério + feedback
 → pontos somados ao vivo → salva (nota fecha quando todas aprovadas)

CORREÇÃO POR IA (professor)
 "Corrigir discursivas com IA" → estimativa (dialog) → run (SSE progress graded/total)
 → tabela de revisão (nível+justificativa+feedback por critério, editáveis)
 → "Aprovar em lote" (human-in-the-loop) → nota fecha
```

SSE faz sentido na correção em lote (mesmo motivo da geração: operação longa, N alunos).
Estimativa reusa exatamente o `generate-confirm-dialog`.

---

## 6. Migração / seed

- **Sem migração obrigatória de dados:** todos os campos novos são aditivos e default null/empty;
  provas e submissions existentes seguem funcionando (objetivas, `gradingStatus = not_required`).
- **Opcional:** script de backfill `gradingStatus` em submissions antigas (ou calcular lazy na
  leitura).
- **Seed:** estender `seed:test-org` com 1 prova contendo questão aberta + rubrica + algumas
  submissions com texto, pra testar correção manual e por IA ponta a ponta.

---

## 7. Plano faseado (entregáveis incrementais)

| Fase | Entrega | Corta sob pressão? |
|---|---|---|
| **0 — Fundação de domínio** | `Rubric` VO, `type:"open"`, schemas exam+submission, validação, composição de nota. Criar questão aberta + rubrica **via API** (sem IA, sem UI). Backward-compat. | Não (base de tudo) |
| **1 — Aluno responde texto** | textarea na `/exam`, `textAnswers` no submit/persistência, `gradingStatus`, nota objetiva parcial + selo "aguardando correção". | Não |
| **2 — Correção MANUAL** | tela de correção, `OpenGrade`, `grade-open-answer-manually`, `approve` implícito no manual, nota final composta. **Entrega valor completo sem IA.** | Não |
| **3 — Geração IA de aberta+rubrica** | generator + prompts (`rubric-contract`, `open-question/guide`), pricing `open`, `RubricEditor`/`OpenQuestionEditor` no wizard (professor verifica). | Sim → professor escreve rubrica na mão |
| **4 — Correção por IA** | prompt `grading/system`, `open-answer-grader`, `estimate-grading` + `grade-open-answers`, débito por resposta, SSE em lote, tela de revisão + **aprovação em lote**. | Sim → fica só manual |
| **5 — Analytics + polish** | reusar visões por habilidade/turma incluindo discursivas; export DOCX da rubrica; limites e quotas. | Sim |

**Ordem deliberada:** valor real (responder + corrigir manual) sai nas Fases 0-2 sem nenhuma
dependência de IA/créditos. IA é incremento, não pré-requisito.

**Pontos de extensão já desenhados pra Fase 2 (não implementar agora):**
- *OCR/manuscrito:* o modelo de resposta carrega proveniência (`textAnswers` evolui pra
  `{ value, source: "typed"|"ocr", imageRef? }`); nada no core de correção muda.
- *Calibração:* o grader (`grade-open-answers` + `grading/system`) já aceita `anchors?:
  GradedExample[]` (respostas corrigidas pelo professor como few-shot). A rubrica com IDs estáveis
  é a âncora comum.

---

## 8. Riscos

- **R1 — Composição da nota (RESOLVIDO, baixo):** decisão tomada — fórmula inalterada, pesos
  iguais, aberta contribui fração ∈ [0,1]. Risco residual: `earned`/`score` fracionário e código
  que assuma `correctCount` inteiro = score. Mitigação: `earnedPoints` float separado, `correctCount`
  inteiro preservado; revisar analytics que derivam acertos do score.
- **R2 — Custo da correção (alto):** N chamadas com resposta longa pode custar mais que a geração.
  Mitigação: estimativa real pré-ação (temos as respostas no banco), débito por-resposta, teto/limite.
- **R3 — Prompt injection via resposta do aluno (alto):** entrada não-confiável direto no prompt.
  Mitigação: `INJECTION_DEFENSE` + nonce + Structured Outputs com `levelId` constrito.
- **R4 — Imutabilidade da submission:** hoje submission é "fecha e acabou". Correção a torna
  mutável pós-submit. Mitigação: `gradingStatus` + `OpenGrade.status`; webhooks só disparam nota
  final após `graded` (cuidado com `submission.completed` que já dispara hoje).
- **R5 — IA "achando" nota (médio):** se o schema deixar a IA devolver número, fura a
  auditabilidade. Mitigação: schema devolve só `levelId`; pontos somados em código; testes.
- **R6 — Conta institucional (médio):** "corrigir tudo" pode drenar o pool. Mitigação P-D:
  estimativa + confirmação + (talvez) permissão por papel.
- **R7 — UX de aprovação em lote (médio):** revisar 1 critério × N alunos pode ser cansativo.
  Mitigação: agrupar por critério/nível, ações em massa, defaults aceitáveis.

---

## 9. Decisões em aberto & PERGUNTAS PRO FUNDADOR

1. **(P-A) Nota final — RESOLVIDO:** fórmula inalterada (`earned/questionCount*10`), pesos iguais;
   aberta contribui fração `rubricObtido/rubricMáx` ∈ [0,1] (crédito parcial). Sem pesos
   customizados por questão na v1. *(Sub-decisão menor a confirmar: arredondamento da fração e se
   o professor pode sobrepor a fração final além de ajustar níveis — proposta: pode sobrepor.)*
2. **(P-B) Visibilidade — RESOLVIDO:** mesma regra da explicação objetiva — aluno vê rubrica +
   nível + feedback por critério no resultado, após a correção. *(Implicação técnica: correção é
   assíncrona ao submit; aluno revisita o link pra ver o resultado corrigido — ver §2.6.)*
3. **(P-C) Tamanho da resposta — RESOLVIDO:** sem limite na v1. *(Risco futuro aceito; reavaliar se
   custo/injeção/abuso aparecerem.)*
4. **(P-D) Quem dispara — RESOLVIDO:** sempre o professor (dono da prova), inclusive em org com
   pool. Sem papel extra; estimativa exibida antes do "corrigir tudo".
5. **(P-E) Input da correção — RESOLVIDO:** sem material-fonte. IA corrige com enunciado + rubrica +
   resposta-modelo + resposta do aluno. Reforça que a **rubrica gerada precisa ser autossuficiente**.
6. **(decisão técnica) Modelo de resposta:** `textAnswers` paralelo (migração leve) vs. `responses`
   union discriminada (mais limpo, migração maior)?
7. **(decisão técnica) Débito:** por-resposta vs. lote+estorno em falha?
8. **(decisão técnica) `LedgerReason`:** reusar `ai_consumption` vs. criar `ai_grading`?
9. **(produto) Reprocessar:** professor edita a rubrica depois de já ter corrigido — re-roda a IA?
   Custa de novo? Invalida aprovações?
10. **(produto) Prova mista + OMR:** prova com objetivas+abertas pode ser respondida em papel
    (objetivas via scan) e abertas online? Ou abertas forçam prova 100% online?

---

## 10. Lista de arquivos a criar/alterar

> `[novo]` = criar, `[alt]` = alterar. Caminhos relativos à raiz do monorepo.

### apps/api — domínio `exam`
- `[novo] apps/api/src/domains/exam/domain/rubric.ts` — VOs Rubric/Criterion/Level + maxPoints/scoreFor + validação.
- `[alt]  apps/api/src/domains/exam/domain/question.ts` — type `"open"`, campos rubric/referenceAnswer, validação por tipo, maxPoints().
- `[alt]  apps/api/src/domains/exam/domain/exam.ts` — helpers hasOpenQuestions/totalMaxPoints.
- `[alt]  apps/api/src/domains/exam/application/create-exam.ts` — mapear rubrica na criação.
- `[alt]  apps/api/src/domains/exam/application/update-exam.ts` — mapear rubrica na edição.
- `[alt]  apps/api/src/domains/exam/application/export-exam-docx.ts` — render de aberta/rubrica no DOCX.
- `[alt]  apps/api/src/domains/exam/infrastructure/exam-schema.ts` — schema rubrica + campos abertos opcionais.
- `[alt]  apps/api/src/domains/exam/infrastructure/docx-exam-builder.ts` — branch de questão aberta.
- `[alt]  apps/api/src/domains/exam/presentation/exam-schemas.ts` — Zod discriminated union + schema rubrica.

### apps/api — domínio `submission`
- `[novo] apps/api/src/domains/submission/domain/open-grade.ts` — VO OpenGrade (critérios, pontos, status, source).
- `[alt]  apps/api/src/domains/submission/domain/submission.ts` — textAnswers, openGrades, gradingStatus, recomposição de nota.
- `[alt]  apps/api/src/domains/submission/domain/submission-errors.ts` — erros de correção.
- `[alt]  apps/api/src/domains/submission/domain/submission-repository.ts` — métodos pra listar pendentes / atualizar grades.
- `[novo] apps/api/src/domains/submission/application/get-submission-for-grading.ts` — carrega submission+rubrica pro professor.
- `[novo] apps/api/src/domains/submission/application/grade-open-answer-manually.ts` — correção manual + recomputo.
- `[novo] apps/api/src/domains/submission/application/save-ai-open-grades.ts` — persiste drafts da IA (port do ai-ops).
- `[novo] apps/api/src/domains/submission/application/approve-open-grades.ts` — aprovação em lote + fecha nota.
- `[alt]  apps/api/src/domains/submission/application/submit-exam.ts` — aceitar textAnswers, setar gradingStatus.
- `[novo] apps/api/src/domains/submission/application/get-public-result.ts` — resultado p/ aluno (objetivas + abertas corrigidas + rubrica/feedback, P-B).
- `[alt]  apps/api/src/domains/submission/infrastructure/submission-schema.ts` — textAnswers, openGrades[], gradingStatus, índices.
- `[alt]  apps/api/src/domains/submission/infrastructure/mongoose-submission-repository.ts` — mapear novos campos.
- `[alt]  apps/api/src/domains/submission/presentation/submission-schemas.ts` — Zod submit+correção+aprovação.
- `[alt]  apps/api/src/domains/submission/presentation/submission-controller.ts` — handlers de grading.
- `[alt]  apps/api/src/domains/submission/presentation/submission-routes.ts` — rotas privadas de grading.

### apps/api — domínio `ai-ops`
- `[alt]  apps/api/src/domains/ai-ops/domain/generation-types.ts` — questionTypes.open, tipos de aberta+rubrica gerada.
- `[alt]  apps/api/src/domains/ai-ops/domain/exam-pricing.ts` — PER_QUESTION["open"].
- `[novo] apps/api/src/domains/ai-ops/domain/grading-pricing.ts` — pricing da correção (token-estimado contra respostas reais).
- `[alt]  apps/api/src/domains/ai-ops/application/generate-exam-questions.ts` — rodada extra de abertas+rubrica.
- `[novo] apps/api/src/domains/ai-ops/application/estimate-grading.ts` — estimativa sem débito.
- `[novo] apps/api/src/domains/ai-ops/application/grade-open-answers.ts` — orquestra IA+débito+persistência; aceita anchors (ext. calibração).
- `[novo] apps/api/src/domains/ai-ops/infrastructure/openai/prompts/shared/rubric-contract.ts` — output-contract da rubrica.
- `[novo] apps/api/src/domains/ai-ops/infrastructure/openai/prompts/open-question/guide.ts` — guia de geração de aberta+rubrica.
- `[novo] apps/api/src/domains/ai-ops/infrastructure/openai/prompts/grading/system.ts` — prompt de correção (injection-defense + nível-only).
- `[novo] apps/api/src/domains/ai-ops/infrastructure/openai/open-question-generator.ts` — geração de aberta+rubrica (Structured Outputs).
- `[novo] apps/api/src/domains/ai-ops/infrastructure/openai/open-answer-grader.ts` — correção; levelId constrito à rubrica.
- `[alt]  apps/api/src/domains/ai-ops/presentation/ai-schemas.ts` — schemas open + grading.
- `[alt]  apps/api/src/domains/ai-ops/presentation/ai-controller.ts` — handlers estimate-grading + grading-run (SSE).
- `[alt]  apps/api/src/domains/ai-ops/presentation/ai-routes.ts` — rotas /v1/ai/grading/*.

### apps/api — composição & billing
- `[alt]  apps/api/src/main.ts` — DI manual dos novos use cases/serviços (grader, grading, correção).
- `[alt]  apps/api/src/domains/billing/...` — sem mudança de core; só novos `relatedAction` (decisão P-8 sobre LedgerReason).

### apps/web — geração & verificação (provas)
- `[alt]  apps/web/src/features/app/provas/steps/step-config.tsx` — opção tipo "Discursiva".
- `[novo] apps/web/src/features/app/provas/components/rubric-editor.tsx` — editor critérios×níveis.
- `[novo] apps/web/src/features/app/provas/components/open-question-editor.tsx` — enunciado+resposta-modelo+rubrica.
- `[alt]  apps/web/src/features/app/provas/components/student-preview.tsx` — preview aberta = textarea.
- `[alt]  apps/web/src/features/app/provas/wizard-store.ts` — estado de aberta+rubrica.
- `[alt]  apps/web/src/features/app/provas/types.ts` — tipos de aberta/rubrica.
- `[alt]  apps/web/src/features/app/provas/actions.ts` — createExam com rubrica.

### apps/web — correção (provas/grading)
- `[novo] apps/web/src/features/app/provas/grading/manual-grading.tsx` — tela de correção manual.
- `[novo] apps/web/src/features/app/provas/grading/ai-grading-review.tsx` — estimativa+SSE+aprovação em lote.
- `[novo] apps/web/src/features/app/provas/grading/data.ts` — fetch submissions p/ grading + estimativa.
- `[novo] apps/web/src/features/app/provas/grading/actions.ts` — server actions de correção/aprovação.
- `[alt]  apps/web/src/features/app/provas/components/submissions-section.tsx` — entrada p/ corrigir + selo gradingStatus.
- `[alt]  apps/web/src/app/app/provas/[id]/page.tsx` — rota/aba de correção.
- `[reuso] apps/web/src/features/app/provas/sse-client.ts` — sem mudança (já genérico).
- `[reuso] apps/web/src/features/app/billing/components/generate-confirm-dialog.tsx` — reusar p/ estimativa de correção.

### apps/web — aluno (public-exam)
- `[alt]  apps/web/src/features/public-exam/types.ts` — PublicQuestionDTO.type "open" (sem rubrica).
- `[alt]  apps/web/src/features/public-exam/public-exam.tsx` — estado textAnswers + submit.
- `[alt]  apps/web/src/features/public-exam/components/exam-taking.tsx` — render textarea p/ aberta.
- `[alt]  apps/web/src/features/public-exam/components/result-screen.tsx` — "aguardando correção" / feedback (P-B).

### Scripts / seed
- `[alt]  apps/api/scripts/seed-test-org.ts` — prova com aberta+rubrica + submissions com texto.
- `[opcional/novo] apps/api/scripts/backfill-grading-status.ts` — gradingStatus em submissions antigas.

---

## Resumo de uma linha

A feature é viável e encaixa bem nos padrões do repo, **mas** parte de uma base onde discursiva
não existe: o trabalho real é (1) criar tipo `open` + rubrica no domínio, (2) tornar a submission
mutável/corrigível com `gradingStatus`, (3) compor a nota com a fração da rubrica **sem mudar a
fórmula atual** (`earned/questionCount*10`, pesos iguais, aberta contribui [0,1] — **decidido**),
e só então (4) plugar IA de geração e correção reaproveitando injection-defense, output-contract,
SSE, estimativa e débito atômico que já existem.
