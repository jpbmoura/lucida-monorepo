import type { RequestHandler } from "express";
import { DomainError } from "@/shared/errors/domain-error.js";
import type { ComputeOverviewUseCase } from "../application/compute-overview.js";
import type { ComputeClassOverviewUseCase } from "../application/compute-class-overview.js";
import type { ComputeStudentOverviewUseCase } from "../application/compute-student-overview.js";
import type { ComputeExamOverviewUseCase } from "../application/compute-exam-overview.js";
import type { ComputeOrgOverviewUseCase } from "../application/compute-org-overview.js";
import type { ListOrgMembersAndInvitationsUseCase } from "../application/list-org-members-and-invitations.js";
import type { AcceptInviteWithSignupUseCase } from "../application/accept-invite-with-signup.js";
import type { GetOrgBillingUseCase } from "../application/get-org-billing.js";
import type { ComputeTeacherOverviewUseCase } from "../application/compute-teacher-overview.js";
import type { ExportTeacherDataUseCase } from "../application/export-teacher-data.js";
import type { OrganizationMembersRepository } from "../application/ports/organization-members-repository.js";
import type { OrganizationInvitationsRepository } from "../application/ports/organization-invitations-repository.js";
import type { OrganizationBillingSettingsRepository } from "@/domains/billing/domain/organization-billing-settings-repository.js";
import type { UserLookupById } from "@/domains/iam/application/ports/user-lookup.js";
import {
  IMPERSONATE_COOKIE_NAME,
  buildImpersonateCookieValue,
  impersonateCookieAttributes,
} from "@/domains/iam/infrastructure/impersonate-cookie.js";
import { IMPERSONATE_ORG_COOKIE_NAME } from "@/domains/iam/infrastructure/impersonate-org-cookie.js";
import { env } from "@/env.js";
import { z } from "zod";
import {
  acceptInviteWithSignupBody,
  classIdParam,
  examIdParam,
  exportTeacherQuery,
  orgOverviewQuery,
  overviewQuery,
  studentIdParam,
  teacherIdParam,
} from "./analytics-schemas.js";

interface Deps {
  computeOverview: ComputeOverviewUseCase;
  computeClassOverview: ComputeClassOverviewUseCase;
  computeStudentOverview: ComputeStudentOverviewUseCase;
  computeExamOverview: ComputeExamOverviewUseCase;
  computeOrgOverview: ComputeOrgOverviewUseCase;
  listOrgMembers: ListOrgMembersAndInvitationsUseCase;
  acceptInviteWithSignup: AcceptInviteWithSignupUseCase;
  getOrgBilling: GetOrgBillingUseCase;
  computeTeacherOverview: ComputeTeacherOverviewUseCase;
  exportTeacherData: ExportTeacherDataUseCase;
  orgMembersRepository: OrganizationMembersRepository;
  orgInvitationsRepository: OrganizationInvitationsRepository;
  orgBillingSettingsRepository: OrganizationBillingSettingsRepository;
  /**
   * Opcional. Quando provido, o `impersonateState` consegue resolver o
   * nome do alvo mesmo quando ele não pertence à mesma org do real user
   * (caso do staff impersonate via Kintal). Sem o lookup, fallback é
   * usar o email como nome.
   */
  userLookup?: UserLookupById;
}

class MissingActiveOrganizationError extends DomainError {
  readonly code = "MISSING_ACTIVE_ORGANIZATION";
  readonly statusCode = 400;
  constructor() {
    super(
      "Nenhuma organização ativa na sessão. Selecione uma antes de consultar o dashboard da instituição.",
    );
  }
}

class CannotImpersonateError extends DomainError {
  readonly code = "CANNOT_IMPERSONATE";
  readonly statusCode = 400;
  constructor(message: string) {
    super(message);
  }
}

const impersonateBody = z.object({
  teacherId: z.string().min(1),
});

export class AnalyticsController {
  constructor(private readonly deps: Deps) {}

  overview: RequestHandler = async (req, res, next) => {
    try {
      const { period } = overviewQuery.parse(req.query);
      const data = await this.deps.computeOverview.execute({
        ownerId: req.auth!.userId,
        period,
      });
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  classOverview: RequestHandler = async (req, res, next) => {
    try {
      const { id } = classIdParam.parse(req.params);
      const { period } = overviewQuery.parse(req.query);
      const data = await this.deps.computeClassOverview.execute({
        classId: id,
        ownerId: req.auth!.userId,
        period,
      });
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  studentOverview: RequestHandler = async (req, res, next) => {
    try {
      const { id } = studentIdParam.parse(req.params);
      const data = await this.deps.computeStudentOverview.execute({
        studentId: id,
        ownerId: req.auth!.userId,
      });
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  examOverview: RequestHandler = async (req, res, next) => {
    try {
      const { id } = examIdParam.parse(req.params);
      const data = await this.deps.computeExamOverview.execute({
        examId: id,
        ownerId: req.auth!.userId,
      });
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  orgOverview: RequestHandler = async (req, res, next) => {
    try {
      const orgId = req.auth!.activeOrganizationId;
      if (!orgId) throw new MissingActiveOrganizationError();

      const { period } = orgOverviewQuery.parse(req.query);
      const data = await this.deps.computeOrgOverview.execute({
        organizationId: orgId,
        period,
      });
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Endpoint leve pra o shell do /analytics popular o badge do topbar sem
   * esperar o overview inteiro. Devolve `null` quando não há org ativa.
   * `myRole` vem junto pra que o frontend consiga autorizar o acesso ao
   * /analytics sem precisar de uma segunda chamada (só owner/admin entra).
   */
  activeOrganization: RequestHandler = async (req, res, next) => {
    try {
      const orgId = req.auth!.activeOrganizationId;
      if (!orgId) {
        res.json({ data: null });
        return;
      }
      const [org, myRole, billing] = await Promise.all([
        this.deps.orgMembersRepository.getOrganization(orgId),
        this.deps.orgMembersRepository.findRole(orgId, req.auth!.userId),
        this.deps.orgBillingSettingsRepository.findByOrg(orgId),
      ]);
      if (!org) {
        res.json({ data: null });
        return;
      }
      // billingMode alimenta decisões visuais do /app (esconder widget de
      // saldo pessoal em modo pool/pay_per_use). Null quando ainda não foi
      // provisionado — frontend trata como "não institucional de fato".
      res.json({
        data: {
          ...org,
          myRole,
          billingMode: billing?.billingMode ?? null,
        },
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Alimenta /analytics/professores: lista members + invites pendentes.
   * Mutações (convidar, cancelar, revogar) continuam sendo via BA client
   * direto — aqui é só leitura agregada.
   */
  membersAndInvitations: RequestHandler = async (req, res, next) => {
    try {
      const orgId = req.auth!.activeOrganizationId;
      if (!orgId) throw new MissingActiveOrganizationError();

      const data = await this.deps.listOrgMembers.execute({
        organizationId: orgId,
      });
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Alimenta o dashboard /analytics com: settings de cobrança, saldo atual
   * da org (wallet scope=org) e ledger recente com nomes dos actors. Gated
   * em requireOrgAdmin — só owner/admin consultam.
   */
  orgBilling: RequestHandler = async (req, res, next) => {
    try {
      const orgId = req.auth!.activeOrganizationId;
      if (!orgId) throw new MissingActiveOrganizationError();

      const data = await this.deps.getOrgBilling.execute({
        organizationId: orgId,
      });
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Drill-down de um professor da instituição. Valida que o teacherId é
   * member da org ativa — evita vazamento de dados quando alguém tenta
   * consultar um userId arbitrário.
   */
  teacherOverview: RequestHandler = async (req, res, next) => {
    try {
      const orgId = req.auth!.activeOrganizationId;
      if (!orgId) throw new MissingActiveOrganizationError();

      const { id } = teacherIdParam.parse(req.params);
      const { period } = orgOverviewQuery.parse(req.query);
      const data = await this.deps.computeTeacherOverview.execute({
        organizationId: orgId,
        teacherId: id,
        period,
      });
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Export do professor: um único CSV com todas as submissões finalizadas
   * que casam com os filtros (date range em `submittedAt`, classIds,
   * examIds — todos opcionais). Provas em andamento ficam sempre de fora.
   */
  teacherExport: RequestHandler = async (req, res, next) => {
    try {
      const orgId = req.auth!.activeOrganizationId;
      if (!orgId) throw new MissingActiveOrganizationError();

      const { id } = teacherIdParam.parse(req.params);
      const filters = exportTeacherQuery.parse(req.query);
      const { csv, filename } = await this.deps.exportTeacherData.execute({
        organizationId: orgId,
        teacherId: id,
        filters,
      });
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`,
      );
      res.setHeader("Cache-Control", "no-store");
      res.end(csv);
    } catch (err) {
      next(err);
    }
  };

  /**
   * Público — aceita um convite criando conta nova para o convidado. O
   * email do convite vira o email da conta (não recebe do body pra evitar
   * atropelo). Após esta chamada, o frontend faz signIn.email com a senha
   * que o user acabou de definir e redireciona pra /app.
   */
  acceptInviteWithSignup: RequestHandler = async (req, res, next) => {
    try {
      const body = acceptInviteWithSignupBody.parse(req.body);
      const result = await this.deps.acceptInviteWithSignup.execute(body);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Público — alimenta /accept-invite antes do user estar autenticado. O
   * `id` do invite é o próprio token (quem tem o link do email, tem posse
   * do invite). Retorna 404 quando id inválido/inexistente; não vaza
   * existência/não existência via status code diferente.
   */
  invitationInfo: RequestHandler = async (req, res, next) => {
    try {
      const id = String(req.params.id ?? "");
      if (!id) {
        res.status(404).json({
          code: "INVITATION_NOT_FOUND",
          message: "Convite não encontrado.",
        });
        return;
      }
      const info = await this.deps.orgInvitationsRepository.getPublicInfo(id);
      if (!info) {
        res.status(404).json({
          code: "INVITATION_NOT_FOUND",
          message: "Convite não encontrado.",
        });
        return;
      }
      res.json({ data: info });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Inicia uma sessão de impersonate. Owner/admin "vira" o teacherId pra
   * navegar no /app como se fosse ele. Validações:
   *   - User real precisa ser owner/admin da org ativa.
   *   - teacherId precisa ser member da org ativa.
   *   - teacherId não pode ser o próprio user (sem auto-impersonate).
   * Seta cookie HttpOnly assinado; o middleware `requireAuth` usa esse
   * cookie pra decorar `req.auth.userId` em chamadas subsequentes.
   */
  startImpersonate: RequestHandler = async (req, res, next) => {
    try {
      // Importante: usar `realUserId`. Se o user já está impersonando
      // alguém, ele NÃO pode trocar de alvo sem antes parar — `userId`
      // estaria poluído com o teacher anterior.
      const realUserId = req.auth!.realUserId;
      const orgId = req.auth!.activeOrganizationId;
      if (!orgId) throw new MissingActiveOrganizationError();

      const { teacherId } = impersonateBody.parse(req.body);
      if (teacherId === realUserId) {
        throw new CannotImpersonateError(
          "Você não pode atuar como você mesmo.",
        );
      }

      const [realRole, teacherRole] = await Promise.all([
        this.deps.orgMembersRepository.findRole(orgId, realUserId),
        this.deps.orgMembersRepository.findRole(orgId, teacherId),
      ]);
      if (realRole !== "owner" && realRole !== "admin") {
        throw new CannotImpersonateError(
          "Apenas owner ou admin pode atuar como outro professor.",
        );
      }
      if (!teacherRole) {
        throw new CannotImpersonateError(
          "Este professor não pertence à instituição ativa.",
        );
      }

      const value = buildImpersonateCookieValue(teacherId, env.AUTH_SECRET);
      res.cookie(
        IMPERSONATE_COOKIE_NAME,
        value,
        impersonateCookieAttributes({
          isProduction: env.NODE_ENV === "production",
        }),
      );
      res.status(200).json({ data: { ok: true, teacherId } });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Estado atual de impersonate da sessão. Frontend chama no layout do
   * /app pra decidir se mostra o banner amarelo "Atuando como X".
   */
  impersonateState: RequestHandler = async (req, res, next) => {
    try {
      const auth = req.auth!;
      if (!auth.isImpersonating) {
        res.json({
          data: {
            isImpersonating: false,
            mode: null,
            realUser: { id: auth.realUserId, email: auth.realEmail },
            actingAs: null,
          },
        });
        return;
      }
      // Distingue origem do impersonate. Frontend usa pra decidir qual
      // endpoint de stop chamar (kintal mantém audit log; analytics não)
      // e pra qual rota redirecionar ao encerrar.
      const mode: "staff" | "org-admin" =
        auth.realUserRole === "staff" ? "staff" : "org-admin";
      const orgId = auth.activeOrganizationId;
      // Em impersonate de org admin, sempre temos org ativa. Em staff
      // impersonate, pode estar null (alvo sem org) ou apontar pra uma
      // org da qual o real user não é member — então a busca via
      // `listMembers` pode não achar. Cai no `userLookup` nesses casos.
      let actingAsName = "";
      if (orgId) {
        const members =
          await this.deps.orgMembersRepository.listMembers(orgId);
        actingAsName =
          members.find((m) => m.userId === auth.userId)?.name ?? "";
      }
      if (!actingAsName && this.deps.userLookup) {
        const target = await this.deps.userLookup.findById(auth.userId);
        actingAsName = target?.name ?? target?.email ?? "";
      }
      res.json({
        data: {
          isImpersonating: true,
          mode,
          realUser: { id: auth.realUserId, email: auth.realEmail },
          actingAs: {
            id: auth.userId,
            email: auth.email,
            name: actingAsName,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Encerra impersonate — limpa o cookie. Idempotente: seguro chamar mesmo
   * sem impersonate ativo.
   */
  stopImpersonate: RequestHandler = async (_req, res, next) => {
    try {
      res.clearCookie(IMPERSONATE_COOKIE_NAME, {
        httpOnly: true,
        sameSite: "lax",
        secure: env.NODE_ENV === "production",
        path: "/",
      });
      // Limpa também o cookie de org — pode estar setado se o impersonate
      // veio do fluxo "Atuar como instituição" do Kintal e o staff
      // encerrou pelo banner do /analytics em vez do botão do Kintal.
      res.clearCookie(IMPERSONATE_ORG_COOKIE_NAME, {
        httpOnly: true,
        sameSite: "lax",
        secure: env.NODE_ENV === "production",
        path: "/",
      });
      res.status(200).json({ data: { ok: true } });
    } catch (err) {
      next(err);
    }
  };
}
