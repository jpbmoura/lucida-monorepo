// Inventário central de todas as foreign keys que referenciam `user._id`.
// Single source of truth pro script de normalização — todo lugar que
// armazena id de user precisa estar listado aqui, ou vira órfão na
// migração. Quando criar um schema novo com user FK, **atualize aqui**.
//
// IMPORTANTE: o nome da collection deve bater EXATAMENTE com o que o
// Mongo armazena. Quase todos os schemas Mongoose declaram explicitamente
// `{ collection: "snake_case" }` em vez de aceitar a pluralização default.
// Use o valor declarado no schema, não a pluralização Mongoose.

export type FieldKind = "string" | "objectid";
export type Source = "ba" | "mongoose";

export interface FkSpec {
  /** Nome físico da collection no Mongo. */
  collection: string;
  /** Campo dentro do doc que carrega o id. */
  field: string;
  /**
   * Como o valor é armazenado fisicamente:
   *  - `objectid`: BA-native (account.userId, member.userId, …)
   *  - `string`: schemas Mongoose declarados como `String`
   */
  kind: FieldKind;
  /**
   * BA usa o driver nativo (`authDb`); Mongoose pode usar a conexão default.
   * No Lucida atual ambos apontam pro mesmo DB (mesmo `MONGODB_URI`), então
   * essa flag é informativa — mas mantém o contrato claro.
   */
  source: Source;
  /**
   * Filtro adicional pra restringir o update — usado quando o campo é
   * polimórfico. Ex: `credit_wallets.ownerId` carrega userId só quando
   * `scope === "user"`; no scope "org" o ownerId é orgId e não pode ser
   * tocado.
   */
  match?: Record<string, unknown>;
}

/**
 * BA collections — `user._id` é referenciado como ObjectId nativo.
 * Quando reescrever, valor novo precisa ser ObjectId, não string.
 */
const BA_FKS: FkSpec[] = [
  { collection: "account", field: "userId", kind: "objectid", source: "ba" },
  { collection: "session", field: "userId", kind: "objectid", source: "ba" },
  { collection: "member", field: "userId", kind: "objectid", source: "ba" },
  { collection: "invitation", field: "inviterId", kind: "objectid", source: "ba" },
];

/**
 * Domínio (Mongoose) — todos os campos são `type: String` nos schemas,
 * armazenam o id como hex string. Update grava `String(newOid)`.
 */
const MONGOOSE_FKS: FkSpec[] = [
  // api-access
  { collection: "api_keys", field: "createdByUserId", kind: "string", source: "mongoose" },
  { collection: "webhook_endpoints", field: "createdByUserId", kind: "string", source: "mongoose" },

  // billing — `ownerId` é polimórfico (user/org). Filtra por scope quando aplicável.
  { collection: "credit_wallets", field: "ownerId", kind: "string", source: "mongoose", match: { scope: "user" } },
  { collection: "credit_ledger", field: "ownerId", kind: "string", source: "mongoose", match: { scope: "user" } },
  { collection: "credit_ledger", field: "actorUserId", kind: "string", source: "mongoose" },
  { collection: "subscriptions", field: "ownerId", kind: "string", source: "mongoose", match: { scope: "user" } },
  { collection: "pix_topup_intents", field: "ownerId", kind: "string", source: "mongoose" },
  { collection: "invoices", field: "ownerId", kind: "string", source: "mongoose", match: { scope: "user" } },

  // núcleo pedagógico
  { collection: "classes", field: "ownerId", kind: "string", source: "mongoose" },
  { collection: "exams", field: "ownerId", kind: "string", source: "mongoose" },
  { collection: "students", field: "ownerId", kind: "string", source: "mongoose" },
  { collection: "submissions", field: "ownerId", kind: "string", source: "mongoose" },
  { collection: "scan_results", field: "ownerId", kind: "string", source: "mongoose" },

  // iam
  { collection: "teacher_assistants", field: "teacherUserId", kind: "string", source: "mongoose" },
  { collection: "teacher_assistants", field: "assistantUserId", kind: "string", source: "mongoose" },
  { collection: "teacher_assistants", field: "createdBy", kind: "string", source: "mongoose" },

  // finance
  { collection: "finance_expenses", field: "createdByUserId", kind: "string", source: "mongoose" },

  // kanban (interno do Kintal)
  { collection: "kanban_cards", field: "assigneeId", kind: "string", source: "mongoose" },
  { collection: "kanban_cards", field: "createdById", kind: "string", source: "mongoose" },

  // kintal
  { collection: "impersonate_sessions", field: "staffUserId", kind: "string", source: "mongoose" },
  { collection: "impersonate_sessions", field: "targetUserId", kind: "string", source: "mongoose" },

  // notifications
  { collection: "notifications", field: "recipientUserId", kind: "string", source: "mongoose" },
  { collection: "notifications", field: "senderUserId", kind: "string", source: "mongoose" },

  // roadmap
  { collection: "roadmap_items", field: "createdBy", kind: "string", source: "mongoose" },
  { collection: "roadmap_votes", field: "userId", kind: "string", source: "mongoose" },

  // tickets / suporte
  { collection: "tickets", field: "userId", kind: "string", source: "mongoose" },
];

export const USER_FK_INVENTORY: FkSpec[] = [...BA_FKS, ...MONGOOSE_FKS];

/**
 * Conjunto de todas as collections envolvidas — útil pro relatório
 * agregado e pra validação final ("nenhum ID legacy sobrou em lugar
 * nenhum").
 */
export const TOUCHED_COLLECTIONS: ReadonlyArray<string> = Array.from(
  new Set(USER_FK_INVENTORY.map((f) => f.collection)),
);
