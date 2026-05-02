import { KintalProfileMenu } from "./profile-menu";
import { NotificationsBell } from "@/features/notifications/components/notifications-bell";

interface KintalTopbarProps {
  userName: string;
  userEmail: string;
  initials: string;
}

// Segue o shape visual do /app e /analytics: altura 72, sticky, bg com
// backdrop-blur, borda inferior cinza. Esquerda fica vazia por enquanto —
// Kintal não tem contexto institucional/org ativa pra mostrar. O sino aponta
// pra inbox pessoal em /app/notificacoes — staff também é user e recebe
// notificações na própria conta; o /kintal/notifications é o form de envio,
// não a inbox.
export function KintalTopbar({
  userName,
  userEmail,
  initials,
}: KintalTopbarProps) {
  return (
    <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between gap-4 border-b border-gray-100 bg-white/85 px-5 backdrop-blur md:px-10">
      <div className="flex min-w-0 items-center gap-3" />

      <div className="flex items-center gap-4">
        <NotificationsBell inboxHref="/app/notificacoes" />

        <div className="mx-2 h-6 w-px bg-gray-200" />

        <KintalProfileMenu
          name={userName}
          email={userEmail}
          initials={initials}
        />
      </div>
    </header>
  );
}
