import { writeFile, readFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { ObjectId, type Db } from "mongodb";

/**
 * Mapa `{ legacyStringId → newObjectId }` — gerado uma vez na primeira
 * fase, persistido em disco pra ser reutilizado entre dry-run e apply
 * (evita gerar ObjectIds diferentes em runs distintos, o que invalidaria
 * checkpoints) e pra servir como artefato de auditoria/rollback.
 */
export interface IdMapEntry {
  legacyId: string;
  newId: string; // hex de 24 chars do ObjectId
  email: string | null;
  legacyClerkId: string | null;
  /**
   * Marcações de progresso — habilita retomar de onde parou.
   *  - `pending`: só inserido no mapa, doc novo nem foi criado.
   *  - `userCopied`: doc novo em `user` já existe.
   *  - `fksRewritten`: todas as foreign keys foram reescritas.
   *  - `cleaned`: doc legacy + sessions deletados.
   */
  status: "pending" | "userCopied" | "fksRewritten" | "cleaned";
}

export interface IdMap {
  generatedAt: string;
  entries: IdMapEntry[];
}

const DEFAULT_MAP_PATH = resolve(
  process.cwd(),
  "scripts/normalize-legacy-user-ids/.id-map.json",
);

export function getIdMapPath(custom?: string | null): string {
  return custom ?? DEFAULT_MAP_PATH;
}

/**
 * Detecta users com `_id` em formato não-ObjectId. Critério:
 *  - `_id` é string E não é hex de 24 chars válido pra ObjectId.
 *
 * Users BA-nativos têm `_id` ObjectId; users Clerk-migrados têm `_id`
 * string UUID (gerado pelo `randomUUID()` no script de migração).
 */
export async function findLegacyUsers(authDb: Db): Promise<
  Array<{
    legacyId: string;
    email: string | null;
    legacyClerkId: string | null;
  }>
> {
  const users = authDb.collection<{
    _id: ObjectId | string;
    email?: string;
    legacyClerkId?: string;
  }>("user");

  // `$type: "string"` filtra docs cujo `_id` é string (não ObjectId).
  const cursor = users.find({ _id: { $type: "string" } as never });
  const out: Array<{
    legacyId: string;
    email: string | null;
    legacyClerkId: string | null;
  }> = [];
  for await (const doc of cursor) {
    out.push({
      legacyId: String(doc._id),
      email: doc.email ?? null,
      legacyClerkId: doc.legacyClerkId ?? null,
    });
  }
  return out;
}

export async function buildIdMap(authDb: Db): Promise<IdMap> {
  const legacy = await findLegacyUsers(authDb);
  return {
    generatedAt: new Date().toISOString(),
    entries: legacy.map((u) => ({
      legacyId: u.legacyId,
      newId: new ObjectId().toHexString(),
      email: u.email,
      legacyClerkId: u.legacyClerkId,
      status: "pending",
    })),
  };
}

export async function saveIdMap(map: IdMap, path: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(map, null, 2), "utf8");
}

export async function loadIdMap(path: string): Promise<IdMap | null> {
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw) as IdMap;
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code?: string }).code === "ENOENT"
    ) {
      return null;
    }
    throw err;
  }
}

/**
 * Carrega o mapa salvo OU cria um novo. Use em todas as fases — a
 * primeira fase persiste, as seguintes só leem.
 */
export async function loadOrBuildIdMap(
  authDb: Db,
  path: string,
): Promise<{ map: IdMap; created: boolean }> {
  const existing = await loadIdMap(path);
  if (existing) return { map: existing, created: false };
  const fresh = await buildIdMap(authDb);
  await saveIdMap(fresh, path);
  return { map: fresh, created: true };
}
