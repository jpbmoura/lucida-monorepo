import type { OrgBillingMode } from "./billing-mode.js";

export interface OrganizationBillingSettingsProps {
  organizationId: string;
  billingMode: OrgBillingMode;
  /** Só relevante quando `billingMode === "per_teacher"`. Null em pool/pay_per_use. */
  perTeacherLimit: number | null;
  /**
   * Ciclo de cobrança — relevante em `pay_per_use` pra agrupar consumo em
   * períodos. Null em prepaid. Reservado pra implementação futura.
   */
  billingCycle: "monthly" | "weekly" | null;
  /**
   * ID da assinatura Stripe da instituição, quando houver. Null enquanto
   * a org é administrada via script (`billing:add-org-credits`).
   */
  stripeSubscriptionId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Configurações de cobrança de uma organização — doc singular por org.
 * Criado com default `billingMode: "pool"` quando a org é provisionada
 * (seed/endpoint de admin); pode ser mudado depois pelo owner na UI.
 */
export class OrganizationBillingSettings {
  private constructor(private props: OrganizationBillingSettingsProps) {}

  static createDefault(organizationId: string, now?: Date): OrganizationBillingSettings {
    const when = now ?? new Date();
    return new OrganizationBillingSettings({
      organizationId,
      billingMode: "pool",
      perTeacherLimit: null,
      billingCycle: null,
      stripeSubscriptionId: null,
      createdAt: when,
      updatedAt: when,
    });
  }

  static restore(props: OrganizationBillingSettingsProps): OrganizationBillingSettings {
    return new OrganizationBillingSettings({ ...props });
  }

  /**
   * Muda o modo de cobrança. Setter explícito (em vez de exposição direta
   * dos props) porque a transição pode ganhar efeitos colaterais — ex.:
   * sair de `pool` zerar wallet, entrar em `unlimited` registrar acordo.
   */
  changeBillingMode(mode: OrgBillingMode): void {
    if (this.props.billingMode === mode) return;
    this.props.billingMode = mode;
    this.props.updatedAt = new Date();
  }

  /** Cortesia / acordo fora-da-plataforma — pula checagem de saldo. */
  isUnlimited(): boolean {
    return this.props.billingMode === "unlimited";
  }

  get organizationId(): string {
    return this.props.organizationId;
  }
  get billingMode(): OrgBillingMode {
    return this.props.billingMode;
  }
  get perTeacherLimit(): number | null {
    return this.props.perTeacherLimit;
  }
  get billingCycle(): "monthly" | "weekly" | null {
    return this.props.billingCycle;
  }
  get stripeSubscriptionId(): string | null {
    return this.props.stripeSubscriptionId;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
