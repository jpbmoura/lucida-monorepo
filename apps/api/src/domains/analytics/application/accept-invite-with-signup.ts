import type {
  InvitationAcceptor,
  AcceptInviteWithSignupInput,
  AcceptInviteWithSignupOutput,
} from "./ports/invitation-acceptor.js";

/**
 * Use case bem fino — só delega pro adapter. A lógica transacional fica no
 * adapter porque é 100% conversa com BA + Mongo. Manter um use case vazio
 * mantém o padrão da camada e facilita trocar a implementação depois
 * (ex: migrar pra transações do Mongo com replica set).
 */
export class AcceptInviteWithSignupUseCase {
  constructor(private readonly acceptor: InvitationAcceptor) {}

  execute(
    input: AcceptInviteWithSignupInput,
  ): Promise<AcceptInviteWithSignupOutput> {
    return this.acceptor.signupAndAccept(input);
  }
}
