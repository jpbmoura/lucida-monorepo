import type { RequestHandler } from "express";
import { z } from "zod";
import type { CreateAssistantUseCase } from "@/domains/iam/application/create-assistant.js";
import type { ListAssistantsForTeacherUseCase } from "@/domains/iam/application/list-assistants-for-teacher.js";
import type { RevokeAssistantUseCase } from "@/domains/iam/application/revoke-assistant.js";
import type { KintalInstitutionsRepository } from "../application/ports/kintal-institutions-repository.js";
import { InstitutionNotFoundError } from "../domain/institutions-errors.js";
import { institutionParam } from "./kintal-institutions-schemas.js";

const teacherInOrgParam = z.object({
  orgId: z.string().min(1),
  teacherId: z.string().min(1),
});

const linkInOrgParam = z.object({
  orgId: z.string().min(1),
  linkId: z.string().min(1),
});

const createBody = z.object({
  email: z.string().trim().email(),
  name: z.string().trim().min(1).max(200),
  password: z.string().min(8).max(200),
});

interface Deps {
  institutions: KintalInstitutionsRepository;
  createAssistant: CreateAssistantUseCase;
  listAssistantsForTeacher: ListAssistantsForTeacherUseCase;
  revokeAssistant: RevokeAssistantUseCase;
}

/**
 * Gestão de auxiliares de professor a partir do Kintal (staff-only). Reusa
 * os use cases do iam — a única diferença pro fluxo do /analytics é que
 * aqui o `organizationId` vem do path em vez do `req.auth.activeOrganizationId`,
 * já que o staff opera sem org ativa de sessão.
 *
 * O `actorUserId` registrado no link é o staff real (`req.auth.realUserId`),
 * o que mantém o audit trail rastreando quem do backoffice criou o vínculo.
 */
export class KintalAssistantsController {
  constructor(private readonly deps: Deps) {}

  list: RequestHandler = async (req, res, next) => {
    try {
      const { orgId, teacherId } = teacherInOrgParam.parse(req.params);
      await this.assertOrgExists(orgId);
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

  create: RequestHandler = async (req, res, next) => {
    try {
      const { orgId, teacherId } = teacherInOrgParam.parse(req.params);
      const body = createBody.parse(req.body);
      await this.assertOrgExists(orgId);
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

  revoke: RequestHandler = async (req, res, next) => {
    try {
      const { orgId, linkId } = linkInOrgParam.parse(req.params);
      await this.assertOrgExists(orgId);
      await this.deps.revokeAssistant.execute({
        linkId,
        organizationId: orgId,
      });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };

  /** Devolve 404 cedo se a org sumiu — evita enviar pro use case com id inválido. */
  private async assertOrgExists(orgId: string): Promise<void> {
    // valida formato + existência via institutionParam pra dar mensagem
    // consistente com o restante das rotas de instituição.
    institutionParam.parse({ orgId });
    const exists = await this.deps.institutions.exists(orgId);
    if (!exists) throw new InstitutionNotFoundError();
  }
}
