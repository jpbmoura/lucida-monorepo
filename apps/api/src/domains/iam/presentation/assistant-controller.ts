import type { RequestHandler } from "express";
import { z } from "zod";
import { env } from "@/env.js";
import type { ListTeachersForAssistantUseCase } from "../application/list-teachers-for-assistant.js";
import type { SelectAssistantTargetUseCase } from "../application/select-assistant-target.js";
import type { SelectAssistantSelfTargetUseCase } from "../application/select-assistant-self-target.js";
import type { CreateAssistantUseCase } from "../application/create-assistant.js";
import type { ListAssistantsForTeacherUseCase } from "../application/list-assistants-for-teacher.js";
import type { RevokeAssistantUseCase } from "../application/revoke-assistant.js";
import {
  ASSISTANT_TARGET_COOKIE_NAME,
  assistantTargetCookieAttributes,
  buildAssistantTargetCookieValue,
} from "../infrastructure/assistant-target-cookie.js";

const selectBody = z.object({
  teacherUserId: z.string().min(1),
});

const createBody = z.object({
  email: z.string().trim().email(),
  name: z.string().trim().min(1).max(200),
  password: z.string().min(8).max(200),
});

const teacherParam = z.object({
  teacherId: z.string().min(1),
});

const linkParam = z.object({
  linkId: z.string().min(1),
});

interface Deps {
  listTeachers: ListTeachersForAssistantUseCase;
  selectTarget: SelectAssistantTargetUseCase;
  selectSelfTarget: SelectAssistantSelfTargetUseCase;
  createAssistant: CreateAssistantUseCase;
  listAssistantsForTeacher: ListAssistantsForTeacherUseCase;
  revokeAssistant: RevokeAssistantUseCase;
}

export class AssistantController {
  constructor(private readonly deps: Deps) {}

  // ─── Endpoints do AUXILIAR (req.auth.realUserId é o auxiliar) ──────

  /**
   * GET /v1/iam/assistant/teachers — lista de professores que o auxiliar
   * pode atender. Vazio se o user real NÃO é auxiliar de ninguém.
   */
  myTeachers: RequestHandler = async (req, res, next) => {
    try {
      const data = await this.deps.listTeachers.execute({
        assistantUserId: req.auth!.realUserId,
      });
      res.json({
        teachers: data.map((t) => ({
          ...t,
          createdAt: t.createdAt.toISOString(),
        })),
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /v1/iam/assistant/select — valida vínculo + seta cookie.
   */
  selectTarget: RequestHandler = async (req, res, next) => {
    try {
      const { teacherUserId } = selectBody.parse(req.body);
      await this.deps.selectTarget.execute({
        assistantUserId: req.auth!.realUserId,
        teacherUserId,
      });
      const value = buildAssistantTargetCookieValue(
        teacherUserId,
        env.AUTH_SECRET,
      );
      res.cookie(
        ASSISTANT_TARGET_COOKIE_NAME,
        value,
        assistantTargetCookieAttributes({
          isProduction: env.NODE_ENV === "production",
        }),
      );
      res.json({ ok: true, teacherUserId });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /v1/iam/assistant/select-self — auxiliar opta por usar a
   * própria conta em vez de atender um professor. Carimba o cookie
   * apontando pro próprio realUserId; o middleware vê target ===
   * realUserId e pula a impersonação. O cookie persiste a escolha
   * pra que o /app não jogue de volta no seletor.
   */
  selectSelfTarget: RequestHandler = async (req, res, next) => {
    try {
      const realUserId = req.auth!.realUserId;
      await this.deps.selectSelfTarget.execute({
        assistantUserId: realUserId,
      });
      const value = buildAssistantTargetCookieValue(
        realUserId,
        env.AUTH_SECRET,
      );
      res.cookie(
        ASSISTANT_TARGET_COOKIE_NAME,
        value,
        assistantTargetCookieAttributes({
          isProduction: env.NODE_ENV === "production",
        }),
      );
      res.json({ ok: true, teacherUserId: realUserId, self: true });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /v1/iam/assistant/clear — limpa o cookie pra "voltar pro
   * seletor". Útil quando o auxiliar quer trocar de professor.
   */
  clearTarget: RequestHandler = async (_req, res) => {
    res.clearCookie(ASSISTANT_TARGET_COOKIE_NAME, { path: "/" });
    res.json({ ok: true });
  };

  // ─── Endpoints do ADMIN ORG (gestão de auxiliares por professor) ───

  /**
   * GET /v1/analytics/teachers/:teacherId/assistants — admin org lista
   * auxiliares de um professor. `req.auth.activeOrganizationId` filtra
   * por org.
   */
  listForTeacher: RequestHandler = async (req, res, next) => {
    try {
      const { teacherId } = teacherParam.parse(req.params);
      const orgId = req.auth!.activeOrganizationId;
      if (!orgId) {
        res.status(400).json({
          code: "MISSING_ACTIVE_ORG",
          message: "Selecione a organização ativa antes de listar auxiliares.",
        });
        return;
      }
      const data = await this.deps.listAssistantsForTeacher.execute({
        teacherUserId: teacherId,
        organizationId: orgId,
      });
      res.json({
        assistants: data.map((a) => ({
          ...a,
          createdAt: a.createdAt.toISOString(),
        })),
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /v1/analytics/teachers/:teacherId/assistants — cria auxiliar.
   */
  create: RequestHandler = async (req, res, next) => {
    try {
      const { teacherId } = teacherParam.parse(req.params);
      const body = createBody.parse(req.body);
      const orgId = req.auth!.activeOrganizationId;
      if (!orgId) {
        res.status(400).json({
          code: "MISSING_ACTIVE_ORG",
          message: "Selecione a organização ativa antes de criar auxiliares.",
        });
        return;
      }
      const result = await this.deps.createAssistant.execute({
        actorUserId: req.auth!.realUserId,
        organizationId: orgId,
        teacherUserId: teacherId,
        assistantEmail: body.email,
        assistantName: body.name,
        assistantPassword: body.password,
      });
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  };

  /**
   * DELETE /v1/analytics/assistants/:linkId — revoga vínculo (soft).
   */
  revoke: RequestHandler = async (req, res, next) => {
    try {
      const { linkId } = linkParam.parse(req.params);
      const orgId = req.auth!.activeOrganizationId;
      if (!orgId) {
        res.status(400).json({
          code: "MISSING_ACTIVE_ORG",
          message: "Selecione a organização ativa antes de revogar.",
        });
        return;
      }
      await this.deps.revokeAssistant.execute({
        linkId,
        organizationId: orgId,
      });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };
}
