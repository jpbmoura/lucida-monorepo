export interface StaffMember {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  staffSince: Date | null;
  createdAt: Date;
}

/**
 * Operações de administração de staff (acesso ao /kintal). Porta atrás da
 * qual ficam as queries na coleção `user` do BetterAuth — o Kintal não
 * possui user próprio.
 */
export interface StaffRepository {
  /** Lista todos users com role=staff, ordenado por nome. */
  listStaff(): Promise<StaffMember[]>;

  /** Busca um user pelo email (qualquer role). Usado no fluxo de promoção. */
  findByEmail(email: string): Promise<StaffMember & { role: string | null } | null>;

  /**
   * Marca o user como staff e grava `staffSince`. Idempotente na borda:
   * chamar de novo num user que já é staff não re-escreve `staffSince`
   * (a decisão de 409 fica no use case).
   */
  promoteToStaff(userId: string, at: Date): Promise<void>;

  /** Remove o role staff (unset role + unset staffSince). */
  revokeStaff(userId: string): Promise<void>;
}
