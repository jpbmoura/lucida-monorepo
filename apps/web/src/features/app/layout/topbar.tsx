import { ProfileMenu } from "./profile-menu";
import { InstitutionalEyebrow } from "./institutional-eyebrow";
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
   * Quando a instituição paga pela ação (pool ou pay_per_use), a wallet
   * pessoal fica congelada/irrelevante — escondemos o BalanceWidget pra
   * não confundir o professor com um saldo que ele não pode gastar.
   */
  hideBalance: boolean;
}

export function Topbar({
  userName,
  userEmail,
  initials,
  initialBalance,
  orgName,
  hideBalance,
}: TopbarProps) {
  return (
    <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between gap-4 border-b border-gray-100 bg-white/85 px-5 backdrop-blur md:px-10">
      <div className="flex min-w-0 items-center gap-3">
        {orgName && <InstitutionalEyebrow orgName={orgName} />}
      </div>

      <div className="flex items-center gap-4">
        {!hideBalance && <BalanceWidget initial={initialBalance} />}

        <NotificationsBell inboxHref="/app/notificacoes" />

        <div className="mx-2 h-6 w-px bg-gray-200" />

        <ProfileMenu name={userName} email={userEmail} initials={initials} />
      </div>
    </header>
  );
}
