import { Router, type RequestHandler } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { ObjectId, type Db } from "mongodb";
import type { Auth } from "../infrastructure/better-auth/auth.js";
import { makeRequireAuth } from "./middleware/require-auth.js";
import type { AssistantController } from "./assistant-controller.js";

interface MakeIamRouterDeps {
  /**
   * Quando provido, expõe `/v1/iam/assistant/*` (lista, select, clear).
   * Sem o controller, esses endpoints simplesmente não existem — útil
   * pra ambientes que não querem habilitar o modo auxiliar.
   */
  assistantController?: AssistantController;
  /**
   * `requireAuth` injetado de fora — em produção a gente passa o que
   * tem repos de org members + teacher_assistants montados. O fallback
   * é um middleware "leve" sem essas features (útil em testes).
   */
  requireAuth?: RequestHandler;
  /**
   * Conexão BA (driver nativo). Usada pelo /v1/me pra carregar o
   * "effective user" quando a sessão é de um auxiliar atuando como
   * professor — senão o /app exibiria o nome do auxiliar.
   */
  authDb?: Db;
}

export function makeIamRouter(
  auth: Auth,
  deps: MakeIamRouterDeps = {},
): Router {
  const router = Router();
  const requireAuth = deps.requireAuth ?? makeRequireAuth(auth);
  const authDb = deps.authDb;

  router.get("/v1/me", requireAuth, async (req, res, next) => {
    try {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
      });
      if (!session) {
        res.status(401).json({ error: "unauthorized" });
        return;
      }

      const ctx = req.auth!;

      // Em modo auxiliar, /v1/me precisa devolver os campos do PROFESSOR
      // (effective user) — é o que o shell do /app mostra. O `realUser`
      // junto vai pro banner ("Logado como auxiliar de X").
      let effective = session.user as Record<string, unknown> & {
        id: string;
        email: string;
        name?: string | null;
        image?: string | null;
      };

      if (ctx.isAssistant && ctx.userId !== ctx.realUserId && authDb) {
        const teacherDoc = await loadUser(authDb, ctx.userId);
        if (teacherDoc) effective = teacherDoc;
      }

      res.json({
        data: {
          id: effective.id,
          email: effective.email,
          name: effective.name ?? "",
          image: effective.image ?? null,
          activeOrganizationId: ctx.activeOrganizationId,
          whatsapp: (effective.whatsapp as string | undefined) ?? "",
          taxId: (effective.taxId as string | null | undefined) ?? null,
          institutionType:
            (effective.institutionType as string | null | undefined) ?? null,
          gender: (effective.gender as string | null | undefined) ?? null,
          teachingLevels: (effective.teachingLevels as string[] | undefined) ?? [],
          subjects: (effective.subjects as string[] | undefined) ?? [],
          acquisitionChannel:
            (effective.acquisitionChannel as string | null | undefined) ?? null,
          stateUf: (effective.stateUf as string | null | undefined) ?? null,
          studentsRange:
            (effective.studentsRange as string | null | undefined) ?? null,
          teachingYears:
            (effective.teachingYears as string | null | undefined) ?? null,
          // Dados fiscais PJ — exigidos pelo backend só quando taxId é CNPJ.
          // PF pode deixar tudo vazio.
          legalName: (effective.legalName as string | null | undefined) ?? null,
          municipalRegistration:
            (effective.municipalRegistration as string | null | undefined) ?? null,
          addressPostalCode:
            (effective.addressPostalCode as string | null | undefined) ?? null,
          addressStreet:
            (effective.addressStreet as string | null | undefined) ?? null,
          addressNumber:
            (effective.addressNumber as string | null | undefined) ?? null,
          addressComplement:
            (effective.addressComplement as string | null | undefined) ?? null,
          addressDistrict:
            (effective.addressDistrict as string | null | undefined) ?? null,
          addressCityCode:
            (effective.addressCityCode as string | null | undefined) ?? null,
          addressCityName:
            (effective.addressCityName as string | null | undefined) ?? null,
          addressStateUf:
            (effective.addressStateUf as string | null | undefined) ?? null,
          addressCountry:
            (effective.addressCountry as string | null | undefined) ?? null,
          // Estado do modo auxiliar — frontend usa pra banner. `realUser`
          // carrega o nome+email do auxiliar real (session.user), não do
          // professor que ele está atuando — o banner mostra "Você
          // (auxiliar) está acessando a conta de (professor)".
          assistantMode: ctx.isAssistant,
          // Auxiliar escolheu "entrar na própria conta" no /auxiliar/escolher.
          // Sem essa flag, o /app não sabe distinguir "auxiliar nunca
          // selecionou" de "auxiliar optou por ele mesmo" e faz redirect
          // de volta pro seletor.
          assistantSelfMode: ctx.assistantSelfMode,
          realUser: ctx.isAssistant
            ? {
                id: ctx.realUserId,
                email: ctx.realEmail,
                name:
                  typeof session.user.name === "string"
                    ? session.user.name
                    : "",
              }
            : null,
        },
      });
    } catch (err) {
      next(err);
    }
  });

  // ─── Endpoints do auxiliar (consumidos pelo /auxiliar/escolher) ─────
  if (deps.assistantController) {
    const c = deps.assistantController;
    router.get("/v1/iam/assistant/teachers", requireAuth, c.myTeachers);
    router.post("/v1/iam/assistant/select", requireAuth, c.selectTarget);
    router.post(
      "/v1/iam/assistant/select-self",
      requireAuth,
      c.selectSelfTarget,
    );
    router.post("/v1/iam/assistant/clear", requireAuth, c.clearTarget);
  }

  return router;
}

interface UserDoc {
  _id: ObjectId;
  id?: string;
  email: string;
  name?: string | null;
  image?: string | null;
  whatsapp?: string;
  taxId?: string | null;
  institutionType?: string | null;
  gender?: string | null;
  teachingLevels?: string[];
  subjects?: string[];
  acquisitionChannel?: string | null;
  stateUf?: string | null;
  studentsRange?: string | null;
  teachingYears?: string | null;
  // Dados fiscais PJ — só preenchidos quando taxId é CNPJ.
  legalName?: string | null;
  municipalRegistration?: string | null;
  addressPostalCode?: string | null;
  addressStreet?: string | null;
  addressNumber?: string | null;
  addressComplement?: string | null;
  addressDistrict?: string | null;
  addressCityCode?: string | null;
  addressCityName?: string | null;
  addressStateUf?: string | null;
  addressCountry?: string | null;
}

async function loadUser(
  authDb: Db,
  userId: string,
): Promise<
  | (Record<string, unknown> & {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
    })
  | null
> {
  let oid: ObjectId;
  try {
    oid = new ObjectId(userId);
  } catch {
    return null;
  }
  const doc = (await authDb
    .collection<UserDoc>("user")
    .findOne({ _id: oid })) as UserDoc | null;
  if (!doc) return null;
  return {
    id: String(doc._id),
    email: doc.email,
    name: doc.name ?? null,
    image: doc.image ?? null,
    whatsapp: doc.whatsapp,
    taxId: doc.taxId,
    institutionType: doc.institutionType,
    gender: doc.gender,
    teachingLevels: doc.teachingLevels,
    subjects: doc.subjects,
    acquisitionChannel: doc.acquisitionChannel,
    stateUf: doc.stateUf,
    studentsRange: doc.studentsRange,
    teachingYears: doc.teachingYears,
    legalName: doc.legalName,
    municipalRegistration: doc.municipalRegistration,
    addressPostalCode: doc.addressPostalCode,
    addressStreet: doc.addressStreet,
    addressNumber: doc.addressNumber,
    addressComplement: doc.addressComplement,
    addressDistrict: doc.addressDistrict,
    addressCityCode: doc.addressCityCode,
    addressCityName: doc.addressCityName,
    addressStateUf: doc.addressStateUf,
    addressCountry: doc.addressCountry,
  };
}
