# eval:generation — harness de avaliação da geração de questões

Tier 0 da auditoria [`docs/audits/ai-ops-prompt-pipeline.md`](../../../../docs/audits/ai-ops-prompt-pipeline.md).
Mede a qualidade do pipeline real de geração (`OpenAiQuestionGenerator` →
prompts → normalizador → validação → top-up) sobre um golden set fixo.

**Por que existe:** antes disso não havia nenhuma medição de qualidade, só
log de erro. Sem número, consertar R1 (gabarito errado em exatas), R2
(explicação incoerente) ou R3 (moderação) é apostar no escuro e toda troca
de modelo/prompt é regressão não detectável.

## Rodar

```bash
# só checagens estruturais (grátis além da geração, ~1 chamada/fixture)
pnpm --filter @lucida/api run eval:generation

# + LLM-as-judge (mede correção do gabarito; custa tokens do modelo juiz)
pnpm --filter @lucida/api run eval:generation -- --judge

# decidir mudança pequena: k amostras/fixture (votos somados) + IC 95%
pnpm --filter @lucida/api run eval:generation -- --judge --samples 3

# subconjunto por id ou área
pnpm --filter @lucida/api run eval:generation -- --filter exatas

# A/B de regressão comparável à baseline (exclui a fixture de segurança)
pnpm --filter @lucida/api run eval:generation -- --judge --samples 3 --exclude seguranca

# teste de capacidade de segurança isolado (R7)
pnpm --filter @lucida/api run eval:generation -- --filter seguranca --judge --samples 3

# modo CI: exit 1 se falha estrutural ou gabarito < 90%
pnpm --filter @lucida/api run eval:generation -- --judge --strict
```

### Poder estatístico (leia antes de comparar runs)

Geração é **não-determinística**. Um run com n pequeno NÃO distingue
regressão real de ruído. O relatório imprime o **IC 95%** de cada métrica —
use-o, não o ponto.

- Golden set atual ≈ 39 questões/run. A 1 amostra (`--samples 1`), p≈0.85 →
  IC ≈ ±11%. Só detecta mudança grosseira.
- Pra decidir um ajuste de prompt/temperatura (efeito esperado ~5-10%), use
  `--samples 3` (≈117 questões → IC ≈ ±6%) e compare os intervalos, não os
  números. Se os IC se sobrepõem, o experimento é **inconclusivo** — não
  conclua ganho/perda.
- Rode baseline e variante na **mesma** invocação de golden set/samples.

Precisa de `.env` válido (mesmo do `pnpm dev`). Modelo do juiz:
`OPENAI_JUDGE_MODEL` (default `gpt-4o` — de propósito mais forte que o
gerador, que roda `gpt-4o-mini`).

## O que mede

- **Estrutural (determinístico, sempre):** contagem, shape de opções por
  estilo/tipo, range do gabarito, política de contexto, sem auto-referência
  ao material, correta ≠ "nenhuma/todas as anteriores", sem emoji, sem
  código BNCC, notação matemática bem-formada (R16), sem duplicatas.
- **Correção (LLM-as-judge, `--judge`):** gabarito de fato correto,
  ancorado no material, explicação coerente com a alternativa marcada,
  dificuldade adequada.

## Saída

Resumo agregado no console + relatório JSON por execução em
`reports/<timestamp>.json` (a pasta é git-ignored — são artefatos locais).
Compare relatórios antes/depois de mexer em prompt/modelo pra ver regressão.

## Manutenção

- Golden set em [`fixtures.ts`](./fixtures.ts) — adicione casos quando achar
  um modo de falha novo (cada fixture documenta o que estressa).
- Limiar de `--strict` (`ANSWER_CORRECT_THRESHOLD`) em
  [`index.ts`](./index.ts).
