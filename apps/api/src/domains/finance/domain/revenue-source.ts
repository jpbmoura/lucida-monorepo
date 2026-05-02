/**
 * Porta pra leitura agregada da receita a partir do credit_ledger
 * (`subscription_renewal` + `topup_purchase`). Cruza o ledger com o catálogo
 * estático de planos/topups (sem consultar Stripe — fonte de verdade pra
 * receita aqui é o que foi efetivamente depositado em wallet).
 */
export interface RevenueByMonth {
  /** Mês 1-12 dentro do range consultado. */
  month: number;
  subscriptionsCents: number;
  topupsCents: number;
  totalCents: number;
}

export interface RevenueSummary {
  subscriptionsCents: number;
  topupsCents: number;
  totalCents: number;
}

export interface RevenueSource {
  totalInRange(range: { from: Date; to: Date }): Promise<RevenueSummary>;

  /**
   * Receita por mês dentro do range. Devolve só meses com movimento; o
   * caller preenche os meses zerados pra plotar série completa.
   */
  monthlyInRange(range: {
    from: Date;
    to: Date;
  }): Promise<RevenueByMonth[]>;
}
