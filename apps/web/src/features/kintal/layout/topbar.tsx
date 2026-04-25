import { KintalProfileMenu } from "./profile-menu";

interface KintalTopbarProps {
  userName: string;
  userEmail: string;
  initials: string;
}

// Segue o shape visual do /app e /analytics: altura 72, sticky, bg com
// backdrop-blur, borda inferior cinza. Esquerda fica vazia por enquanto —
// Kintal não tem contexto institucional/org ativa pra mostrar. Direita
// carrega só o ProfileMenu; sem sino de notificações, porque o backoffice
// ainda não tem sistema de notificações próprio.
export function KintalTopbar({
  userName,
  userEmail,
  initials,
}: KintalTopbarProps) {
  return (
    <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between gap-4 border-b border-gray-100 bg-white/85 px-5 backdrop-blur md:px-10">
      <div className="flex min-w-0 items-center gap-3" />

      <div className="flex items-center gap-4">
        <KintalProfileMenu
          name={userName}
          email={userEmail}
          initials={initials}
        />
      </div>
    </header>
  );
}
