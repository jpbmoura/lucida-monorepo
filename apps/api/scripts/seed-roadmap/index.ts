// Popula o roadmap público com itens fictícios pra dar o que ver na tela.
// Idempotente: usa _id determinístico por slug, então rodar várias vezes
// só atualiza os campos sem duplicar docs.
//
// Uso:
//   pnpm --filter @lucida/api run seed:roadmap
//
// Flags:
//   --reset    apaga todos os roadmap_items e roadmap_votes antes de semear
//
// Se você quer mais ou menos itens, edite SEED_ITEMS abaixo.

import { connectMongo } from "../../src/infrastructure/database/mongodb/connection.js";
import { env } from "../../src/env.js";
import mongoose from "mongoose";
import { RoadmapItemModel } from "../../src/domains/roadmap/infrastructure/roadmap-item-schema.js";
import { RoadmapVoteModel } from "../../src/domains/roadmap/infrastructure/roadmap-vote-schema.js";
import type {
  RoadmapProduct,
  RoadmapSource,
  RoadmapStage,
} from "../../src/domains/roadmap/domain/roadmap-types.js";

interface SeedItem {
  slug: string;
  title: string;
  description: string;
  product: RoadmapProduct;
  stage: RoadmapStage;
  source: RoadmapSource;
  votes: number;
  staffNote: string | null;
}

const SEED_ITEMS: SeedItem[] = [
  {
    slug: "exam-shared-question-bank",
    title: "Banco de questões compartilhado",
    description:
      "Permitir que professores da mesma instituição reutilizem questões já criadas — com filtros por matéria, série e nível.",
    product: "exam",
    stage: "in_progress",
    source: "staff",
    votes: 0,
    staffNote: null,
  },
  {
    slug: "analytics-class-comparison",
    title: "Comparação de turmas no Analytics",
    description:
      "Visualização lado a lado de desempenho médio, evolução por habilidade e taxa de presença entre turmas da mesma instituição.",
    product: "analytics",
    stage: "shipped",
    source: "staff",
    votes: 0,
    staffNote: null,
  },
  {
    slug: "analytics-excel-export",
    title: "Exportar relatórios em Excel",
    description:
      "Hoje os relatórios saem só em PDF. Excel ajuda quando a coordenação precisa cruzar dados com outras planilhas.",
    product: "analytics",
    stage: "suggested",
    source: "community",
    votes: 8,
    staffNote: null,
  },
  {
    slug: "exam-dark-mode",
    title: "Tema escuro no app",
    description:
      "Modo dark pra reduzir cansaço visual à noite, especialmente na tela de correção e revisão de provas.",
    product: "exam",
    stage: "suggested",
    source: "community",
    votes: 1,
    staffNote: null,
  },
];

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const shouldReset = args.includes("--reset");

  await connectMongo(env.MONGODB_URI);

  if (shouldReset) {
    const itemsRes = await RoadmapItemModel.deleteMany({}).exec();
    const votesRes = await RoadmapVoteModel.deleteMany({}).exec();
    console.log(
      `[reset] removed ${itemsRes.deletedCount} items, ${votesRes.deletedCount} votes`,
    );
  }

  const now = new Date();
  for (const item of SEED_ITEMS) {
    const id = `seed-${item.slug}`;
    await RoadmapItemModel.updateOne(
      { _id: id },
      {
        $set: {
          title: item.title,
          description: item.description,
          product: item.product,
          stage: item.stage,
          source: item.source,
          votes: item.votes,
          moderationStatus: "auto_approved",
          createdBy: null,
          staffNote: item.staffNote,
          updatedAt: now,
        },
        $setOnInsert: {
          _id: id,
          createdAt: now,
        },
      },
      { upsert: true },
    ).exec();
    console.log(`[ok] ${id} → ${item.stage} · ${item.product} · ${item.votes}v`);
  }

  console.log(`\nSeed completo: ${SEED_ITEMS.length} items.`);
}

main()
  .then(async () => {
    await mongoose.disconnect();
  })
  .catch(async (err) => {
    process.stderr.write(
      `\nFATAL: ${err instanceof Error ? err.stack : String(err)}\n`,
    );
    await mongoose.disconnect();
    process.exit(1);
  });
