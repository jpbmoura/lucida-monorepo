/**
 * Port pra resolver `userId` a partir de um email. Usado quando criamos
 * ticket de origem `email` — se o email do cliente bate com alguém
 * cadastrado, populamos `ticket.userId` pra deeplink + analytics.
 *
 * Retorna null pra emails sem cadastro (ainda viram ticket — só sem
 * vínculo).
 */
export interface UserLookup {
  findIdByEmail(email: string): Promise<string | null>;
}
