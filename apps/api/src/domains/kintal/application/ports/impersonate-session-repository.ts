import type { ImpersonateSession } from "../../domain/impersonate-session.js";
import type { ImpersonateSessionId } from "../../domain/impersonate-session-id.js";

export interface ImpersonateSessionRepository {
  nextId(): ImpersonateSessionId;
  save(session: ImpersonateSession): Promise<void>;
  findById(id: ImpersonateSessionId): Promise<ImpersonateSession | null>;

  /**
   * Busca a sessão ativa (stoppedAt=null) iniciada por um staff. Há no
   * máximo uma — quando uma nova é aberta, a anterior é fechada com
   * reason="superseded".
   */
  findOpenByStaff(staffUserId: string): Promise<ImpersonateSession | null>;
}
