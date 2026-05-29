import Link from "next/link";
import { ProfileMenu } from "./profile-menu";
import { InstitutionalEyebrow } from "./institutional-eyebrow";
import { AppMobileNav } from "./mobile-nav";
import { Logo } from "@/components/brand/logo";
import { BalanceWidget } from "@/features/app/billing/components/balance-widget";
import { NotificationsBell } from "@/features/notifications/components/notifications-bell";

interface TopbarProps {
  userName: string;
  userEmail: string;
  initials: string;
  initialBalance: number | null;
  /** Nome da organização a que o user pertence. `null` pra professor
   *  avulso — o eyebrow "Via X" não é renderizado. */
  orgName: string | null;
  /**
   * True quando o user é owner/admin da org ativa. Define se o eyebrow
   * vira link clicável pro /analytics ou só um label decorativo.
   */
  isOrgAdmin: boolean;
  /**
   * Quando a instituição paga pela ação (pool ou pay_per_use), a wallet
   * pessoal fica congelada/irrelevante — escondemos o BalanceWidget pra
   * não confundir o professor com um saldo que ele não pode gastar.
   */
  hideBalance: boolean;
  /**
   * True quando o user real é auxiliar (tem ≥1 vínculo ativo). Habilita
   * o atalho "Trocar conta" no menu de perfil — leva pro
   * /auxiliar/escolher pra trocar entre a própria conta e as contas dos
   * professores que ele atende.
   */
  isAssistant: boolean;
  /** Passado ao drawer mobile pra decidir se mostra o card de upgrade. */
  hasActiveSubscription: boolean;
}

export function Topbar({
  userName,
  userEmail,
  initials,
  initialBalance,
  orgName,
  isOrgAdmin,
  hideBalance,
  isAssistant,
  hasActiveSubscription,
}: TopbarProps) {
  return (
    <header className="safe-top sticky top-0 z-20 flex min-h-18 items-center justify-between gap-4 border-b border-gray-100 bg-white/85 px-5 backdrop-blur md:px-10">
      <div className="flex min-w-0 items-center gap-2">
        {/* Mobile: hamburger abre o drawer; o logo substitui o da sidebar
            (escondida em < lg). Ambos somem em lg+. */}
        <AppMobileNav hasActiveSubscription={hasActiveSubscription} />
        <Link
          href="/app"
          aria-label="Ir para o dashboard"
          className="shrink-0 lg:hidden"
        >
          <Logo priority className="h-6" />
        </Link>
        {orgName && (
          <div className="hidden min-w-0 sm:flex">
            <InstitutionalEyebrow orgName={orgName} isAdmin={isOrgAdmin} />
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {!hideBalance && <BalanceWidget initial={initialBalance} />}

        <NotificationsBell inboxHref="/app/notificacoes" />

        <div className="mx-2 h-6 w-px bg-gray-200" />

        <ProfileMenu
          name={userName}
          email={userEmail}
          initials={initials}
          isAssistant={isAssistant}
        />
      </div>
    </header>
  );
}
