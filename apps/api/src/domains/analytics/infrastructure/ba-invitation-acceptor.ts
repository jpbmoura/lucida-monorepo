import { ObjectId, type Db } from "mongodb";
import { DomainError } from "@/shared/errors/domain-error.js";
import type { Auth } from "@/domains/iam/infrastructure/better-auth/auth.js";
import type {
  InvitationAcceptor,
  AcceptInviteWithSignupInput,
  AcceptInviteWithSignupOutput,
} from "../application/ports/invitation-acceptor.js";

export class InvitationAcceptError extends DomainError {
  readonly statusCode: number;
  constructor(
    readonly code:
      | "INVITATION_NOT_FOUND"
      | "INVITATION_NOT_PENDING"
      | "INVITATION_EXPIRED"
      | "USER_ALREADY_EXISTS"
      | "SIGNUP_FAILED",
    message: string,
    statusCode = 400,
  ) {
    super(message);
    this.statusCode = statusCode;
  }
}

/**
 * Implementação que orquestra BA signup + Mongo direto (emailVerified,
 * member, invite status). Não é uma transação real — se algum passo falhar
 * no meio, pode sobrar lixo. Pra MVP, aceitável: o backend é pra uso
 * controlado e o cenário "user criado mas member não" é raro e fácil de
 * consertar via script admin.
 */
export class BaInvitationAcceptor implements InvitationAcceptor {
  constructor(
    private readonly auth: Auth,
    private readonly authDb: Db,
  ) {}

  async signupAndAccept(
    input: AcceptInviteWithSignupInput,
  ): Promise<AcceptInviteWithSignupOutput> {
    const invCollection = this.authDb.collection<{
      _id: ObjectId;
      email: string;
      status: "pending" | "accepted" | "canceled" | "rejected";
      expiresAt: Date;
      organizationId: ObjectId;
      role: "owner" | "admin" | "member";
    }>("invitation");

    let invOid: ObjectId;
    try {
      invOid = new ObjectId(input.invitationId);
    } catch {
      throw new InvitationAcceptError(
        "INVITATION_NOT_FOUND",
        "Convite não encontrado.",
        404,
      );
    }

    const inv = await invCollection.findOne({ _id: invOid });
    if (!inv) {
      throw new InvitationAcceptError(
        "INVITATION_NOT_FOUND",
        "Convite não encontrado.",
        404,
      );
    }
    if (inv.status !== "pending") {
      throw new InvitationAcceptError(
        "INVITATION_NOT_PENDING",
        "Este convite já foi aceito ou cancelado.",
      );
    }
    if (inv.expiresAt.getTime() <= Date.now()) {
      throw new InvitationAcceptError(
        "INVITATION_EXPIRED",
        "Este convite expirou. Peça um novo ao administrador.",
      );
    }

    const users = this.authDb.collection("user");
    const existing = await users.findOne({ email: inv.email });
    if (existing) {
      throw new InvitationAcceptError(
        "USER_ALREADY_EXISTS",
        "Já existe uma conta com este e-mail. Entre com sua senha pra aceitar o convite.",
      );
    }

    let userId: string;
    try {
      const result = await this.auth.api.signUpEmail({
        body: {
          email: inv.email,
          password: input.password,
          name: input.name,
        },
      });
      userId = result.user.id;
    } catch (err) {
      // `sendOnSignUp: true` tenta mandar email de verificação. Se o SMTP
      // falhar mas o user foi criado no banco, seguimos. Senão, propaga.
      const fallback = await users.findOne({ email: inv.email });
      if (!fallback) {
        throw new InvitationAcceptError(
          "SIGNUP_FAILED",
          err instanceof Error ? err.message : "Falha ao criar a conta.",
        );
      }
      userId = String(fallback._id);
    }

    const userOid = new ObjectId(userId);

    // O invite é prova de posse do email → podemos marcar como verificado
    // sem passar pelo fluxo de click-link.
    await users.updateOne(
      { _id: userOid },
      { $set: { emailVerified: true, updatedAt: new Date() } },
    );

    // Cria membership. userId e organizationId são ObjectId (convenção do
    // BA) — se guardarmos strings, `organization.list` volta vazio.
    await this.authDb.collection("member").insertOne({
      _id: new ObjectId(),
      organizationId: inv.organizationId,
      userId: userOid,
      role: inv.role,
      createdAt: new Date(),
    });

    await invCollection.updateOne(
      { _id: invOid },
      { $set: { status: "accepted" } },
    );

    return { userId, email: inv.email };
  }
}
