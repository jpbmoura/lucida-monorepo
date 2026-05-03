/**
 * Lookup mínimo de user pelo id. Usado pelo middleware `requireAuth`
 * pra resolver dados do alvo durante impersonate de staff (sem acoplar
 * a um repo de outro domínio).
 */
export interface UserBasicInfo {
  id: string;
  name: string | null;
  email: string;
}

export interface UserLookupById {
  findById(userId: string): Promise<UserBasicInfo | null>;
}
