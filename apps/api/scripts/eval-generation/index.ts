// Harness de avaliação da geração de questões (Tier 0 da auditoria ai-ops).
//
// Roda o pipeline REAL (OpenAiQuestionGenerator → prompts → normalizador →
// validação → top-up) sobre o golden set e mede a TAXA de aderência. Não é
// teste unitário (chama OpenAI, custa, é não-determinístico) — é uma
// ferramenta de medição rodada sob demanda.
//
// Geração é não-determinística: 1 run/fixture (n pequeno) NÃO distingue
// regressão real de ruído de amostragem. Use `--samples k` (k runs por
// fixture, votos somados) pra decidir mudanças pequenas — o relatório
// imprime o IC 95% pra você ver o poder estatístico.
//
// Uso:
//   pnpm --filter @lucida/api run eval:generation
//   pnpm --filter @lucida/api run eval:generation -- --judge --samples 3
//   pnpm --filter @lucida/api run eval:generation -- --filter exatas
//   pnpm --filter @lucida/api run eval:generation -- --judge --strict
//
// Flags:
//   --judge      liga o LLM-as-judge (mede correção; custa tokens)
//   --samples N  k runs por fixture (default 1; 3-5 p/ decidir mudança)
//   --filter X   só fixtures cujo id OU área contém X
//   --strict     exit 1 se falha estrutural ou gabarito < limiar
//
// Precisa de .env válido (mesmo do `pnpm dev`). Juiz: OPENAI_JUDGE_MODEL
// (default gpt-4o, de propósito mais forte que o gerador).

import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { env } from "../../src/env.js";
import { OpenAiQuestionGenerator } from "../../src/domains/ai-ops/infrastructure/openai/openai-question-generator.js";
import type {
  GeneratedQuestion,
  GenerationConfig,
} from "../../src/domains/ai-ops/domain/generation-types.js";
import { FIXTURES } from "./fixtures.js";
import { runStructuralChecks, type CheckResult } from "./checks.js";
import { Judge, JUDGE_MODEL, type Verdict } from "./judge.js";

const ANSWER_CORRECT_THRESHOLD = 0.9; // limiar p/ --strict no rate de gabarito

interface SampleRun {
  sample: number;
  ok: boolean;
  error?: string;
  questionCount: number;
  usage?: { inputTokens: number; outputTokens: number; credits: number };
  checks: CheckResult[];
  verdicts?: Verdict[];
}

interface FixtureReport {
  id: string;
  area: string;
  samples: SampleRun[];
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i !== -1 ? process.argv[i + 1] : undefined;
}
const hasFlag = (name: string) => process.argv.includes(name);

/** IC 95% (aprox. normal) pra uma proporção — mostra o poder do n. */
function ci95(pass: number, total: number): string {
  if (total === 0) return "—";
  const p = pass / total;
  const half = 1.96 * Math.sqrt((p * (1 - p)) / total);
  return `${Math.round(p * 100)}% ±${Math.round(half * 100)}% (n=${total})`;
}

async function main() {
  const useJudge = hasFlag("--judge") || process.env.EVAL_JUDGE === "1";
  const strict = hasFlag("--strict");
  const filter = arg("--filter")?.toLowerCase();
  const exclude = arg("--exclude")?.toLowerCase();
  const samples = Math.max(1, Number(arg("--samples") ?? 1) || 1);

  const fixtures = FIXTURES.filter((f) => {
    const hay = `${f.id} ${f.area}`.toLowerCase();
    if (filter && !hay.includes(filter)) return false;
    if (exclude && hay.includes(exclude)) return false;
    return true;
  });

  if (fixtures.length === 0) {
    console.error(`Nenhum fixture casa com --filter "${filter}".`);
    process.exit(1);
  }

  console.log(
    `\n▶ eval:generation — ${fixtures.length} fixture(s) × ${samples} amostra(s)` +
      ` | gen=${env.OPENAI_MODEL} | judge=${useJudge ? JUDGE_MODEL : "off"}\n`,
  );

  const generator = new OpenAiQuestionGenerator();
  const judge = useJudge ? new Judge() : null;
  const reports: FixtureReport[] = [];

  for (const f of fixtures) {
    // Fixtures são todas pt-BR (material e checagens em português).
    const config: GenerationConfig = { ...f.config, language: "pt-BR" };
    const runs: SampleRun[] = [];
    for (let s = 1; s <= samples; s++) {
      const tag = samples > 1 ? `${f.id} [${s}/${samples}]` : f.id;
      process.stdout.write(`  ${tag} … `);
      let questions: GeneratedQuestion[] = [];
      let usage: SampleRun["usage"];
      try {
        const result = await generator.generate({
          config,
          sources: [{ text: f.material, sourceLabel: "golden" }],
        });
        questions = result.questions;
        usage = result.usage;
      } catch (err) {
        runs.push({
          sample: s,
          ok: false,
          error: (err as Error).message,
          questionCount: 0,
          checks: [],
        });
        console.log("ERRO (geração)");
        continue;
      }

      const checks = runStructuralChecks(config, questions);
      const verdicts = judge
        ? await judge.judge(f.material, config, questions)
        : undefined;
      const structFail = checks.filter((c) => !c.passed).length;
      runs.push({
        sample: s,
        ok: structFail === 0,
        questionCount: questions.length,
        usage,
        checks,
        verdicts,
      });

      const judgeBit = verdicts
        ? ` | gabarito ${verdicts.filter((v) => v.answerCorrect).length}/${verdicts.length}`
        : "";
      console.log(
        structFail === 0
          ? `OK (${questions.length}q)${judgeBit}`
          : `${structFail} check(s) falharam${judgeBit}`,
      );
    }
    reports.push({ id: f.id, area: f.area, samples: runs });
  }

  printSummary(reports, useJudge, samples);
  const reportPath = writeReport(reports, useJudge, samples);
  console.log(`\n📄 Relatório completo: ${reportPath}\n`);

  if (strict) {
    const runs = reports.flatMap((r) => r.samples);
    const anyStructFail = runs.some((r) => !r.ok || r.error);
    const v = runs.flatMap((r) => r.verdicts ?? []);
    const correctRate = v.length
      ? v.filter((x) => x.answerCorrect).length / v.length
      : 1;
    if (anyStructFail || correctRate < ANSWER_CORRECT_THRESHOLD) {
      console.error(
        `✗ strict: falha estrutural=${anyStructFail} | gabarito=${(correctRate * 100).toFixed(0)}% (limiar ${ANSWER_CORRECT_THRESHOLD * 100}%)`,
      );
      process.exit(1);
    }
  }
}

function printSummary(
  reports: FixtureReport[],
  useJudge: boolean,
  samples: number,
) {
  const runs = reports.flatMap((r) => r.samples);

  console.log("\n─── Checagens estruturais (agregado sobre runs) ───");
  const byCheck = new Map<
    string,
    { label: string; pass: number; total: number }
  >();
  for (const run of runs) {
    for (const c of run.checks) {
      const e = byCheck.get(c.id) ?? { label: c.label, pass: 0, total: 0 };
      e.total += 1;
      if (c.passed) e.pass += 1;
      byCheck.set(c.id, e);
    }
  }
  for (const [id, e] of byCheck) {
    const flag = e.pass === e.total ? "✓" : "✗";
    console.log(`  ${flag} ${e.pass}/${e.total}  ${id} — ${e.label}`);
  }

  const detailed = reports.flatMap((r) =>
    r.samples.flatMap((run) =>
      run.checks
        .filter((c) => !c.passed)
        .map(
          (c) =>
            `  • ${r.id}${samples > 1 ? ` [${run.sample}]` : ""} → ${c.id}: ${c.failures.join("; ")}`,
        ),
    ),
  );
  if (detailed.length) {
    console.log("\n─── Falhas estruturais ───");
    detailed.forEach((d) => console.log(d));
  }
  const genErrors = reports.flatMap((r) =>
    r.samples
      .filter((run) => run.error)
      .map((run) => `  • ${r.id} [${run.sample}]: ${run.error}`),
  );
  if (genErrors.length) {
    console.log("\n─── Erros de geração ───");
    genErrors.forEach((d) => console.log(d));
  }

  if (useJudge) {
    const v = runs.flatMap((r) => r.verdicts ?? []);
    if (v.length) {
      console.log("\n─── Julgamento por LLM (correção) ───");
      const line = (label: string, k: keyof Verdict) =>
        console.log(
          `  ${label.padEnd(26, ".")} ${ci95(v.filter((x) => x[k] === true).length, v.length)}`,
        );
      line("gabarito correto", "answerCorrect");
      line("ancorado no material", "groundedInMaterial");
      line("explicação coerente", "explanationConsistent");
      line("dificuldade adequada", "difficultyMatch");

      // Estabilidade por fixture — quanto o gabarito oscila entre amostras
      // (sinal de não-determinismo; ajuda a calibrar quantas amostras usar).
      if (samples > 1) {
        console.log("\n  Gabarito correto por fixture (amostras):");
        for (const r of reports) {
          const perSample = r.samples.map((run) => {
            const vs = run.verdicts ?? [];
            return vs.length
              ? `${vs.filter((x) => x.answerCorrect).length}/${vs.length}`
              : "—";
          });
          console.log(`  • ${r.id.padEnd(34)} ${perSample.join("  ")}`);
        }
      }

      const bad = reports.flatMap((r) =>
        r.samples.flatMap((run) =>
          (run.verdicts ?? [])
            .filter(
              (x) =>
                !x.answerCorrect ||
                !x.groundedInMaterial ||
                !x.explanationConsistent,
            )
            .map(
              (x) =>
                `  • ${r.id}${samples > 1 ? ` [${run.sample}]` : ""} q${x.questionIndex + 1}: ${x.notes}`,
            ),
        ),
      );
      if (bad.length) {
        console.log("\n  Problemas apontados pelo juiz:");
        bad.forEach((b) => console.log(b));
      }
    }
  }

  const tok = runs.reduce(
    (a, r) => ({
      inp: a.inp + (r.usage?.inputTokens ?? 0),
      out: a.out + (r.usage?.outputTokens ?? 0),
      cr: a.cr + (r.usage?.credits ?? 0),
    }),
    { inp: 0, out: 0, cr: 0 },
  );
  console.log(
    `\n─── Custo (só geração) ───\n  tokens in=${tok.inp} out=${tok.out} | créditos=${tok.cr}`,
  );
}

function writeReport(
  reports: FixtureReport[],
  useJudge: boolean,
  samples: number,
): string {
  const dir = join(dirname(fileURLToPath(import.meta.url)), "reports");
  mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const path = join(dir, `${stamp}.json`);
  writeFileSync(
    path,
    JSON.stringify(
      {
        startedAt: new Date().toISOString(),
        genModel: env.OPENAI_MODEL,
        judgeModel: useJudge ? JUDGE_MODEL : null,
        samples,
        reports,
      },
      null,
      2,
    ),
    "utf-8",
  );
  return path;
}

main().catch((err) => {
  console.error("\n✗ eval:generation falhou:", err);
  process.exit(1);
});
