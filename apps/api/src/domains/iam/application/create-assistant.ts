import { ObjectId, type Db } from "mongodb";
import type { Auth } from "../infrastructure/better-auth/auth.js";
import type { OrganizationMembersRepository } from "@/domains/analytics/application/ports/organization-members-repository.js";
import type { TeacherAssistantRepository } from "../domain/teacher-assistant-repository.js";
import { TeacherAssistant } from "../domain/teacher-assistant.js";
import {
  AssistantAlreadyLinkedError,
  InvalidAssistantInputError,
  TeacherNotInOrganizationError,
} from "../domain/teacher-assistant-errors.js";

export interface CreateAssistantInput {
  /** Admin/owner que está executando — vai pra `createdBy`. */
  actorUserId: string;
  organizationId: string;
  teacherUserId: string;
  assistantEmail: string;
  assistantName: string;
  assistantPassword: string;
}

export interface CreateAssistantResult {
  assistantUserId: string;
  linkId: string;
}

/**
 * Cria um auxiliar pra um professor da instituição. Se o user auxiliar
 * já existe (mesmo email), reusa — qualquer conta serve, inclusive
 * professores, owners de instituição e staff. Senão cria via BA com
 * email/senha definidos pelo admin (emailVerified=true, igual
 * seed/institutions).
 *
 * Validações:
 *  - Professor é member da org.
 *  - Não existe vínculo ativo (assistant, teacher) duplicado.
 */
export class CreateAssistantUseCase {
  constructor(
    private readonly assistants: TeacherAssistantRepository,
    private readonly orgMembers: OrganizationMembersRepository,
    private readonly auth: Auth,
    private readonly authDb: Db,
  ) {}

  async execute(input: CreateAssistantInput): Promise<CreateAssistantResult> {
    const email = input.assistantEmail.trim().toLowerCase();
    const name = input.assistantName.trim();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      throw new InvalidAssistantInputError("Email inválido.");
    }
    if (!name) {
      throw new InvalidAssistantInputError("Informe o nome do auxiliar.");
    }
    if (input.assistantPassword.length < 8) {
      throw new InvalidAssistantInputError(
        "Senha precisa ter pelo menos 8 caracteres.",
      );
    }

    // 1. Professor precisa ser member ativo da org.
    const teacherRole = await this.orgMembers.findRole(
      input.organizationId,
      input.teacherUserId,
    );
    if (!teacherRole) throw new TeacherNotInOrganizationError();

    // 2. Resolve user auxiliar (cria ou reusa).
    const users = this.authDb.collection<{
      _id: ObjectId;
      email?: string;
    }>("user");
    const existing = await users.findOne({ email });

    let assistantUserId: string;
    if (existing) {
      assistantUserId = String(existing._id);
    } else {
      try {
        const result = await this.auth.api.signUpEmail({
          body: {
            email,
            password: input.assistantPassword,
            name,
          },
        });
        assistantUserId = result.user.id;
      } catch (err) {
        // SMTP failure path — checa fallback.
        const fallback = await users.findOne({ email });
        if (!fallback) {
          throw new Error(
            `Falha ao criar user auxiliar: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
        assistantUserId = String(fallback._id);
      }
      await users.updateOne(
        { _id: new ObjectId(assistantUserId) },
        {
          $set: {
            emailVerified: true,
            needsEmailUpdate: false,
            updatedAt: new Date(),
          },
        },
      );
    }

    // 3. Vínculo único ativo.
    const dup = await this.assistants.existsActiveLink({
      assistantUserId,
      teacherUserId: input.teacherUserId,
    });
    if (dup) throw new AssistantAlreadyLinkedError();

    const link = TeacherAssistant.create({
      id: this.assistants.nextId(),
      teacherUserId: input.teacherUserId,
      assistantUserId,
      organizationId: input.organizationId,
      createdBy: input.actorUserId,
    });
    await this.assistants.save(link);

    return { assistantUserId, linkId: link.id };
  }
}
