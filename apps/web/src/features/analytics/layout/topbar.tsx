import { Bell } from "lucide-react";
import { AnalyticsProfileMenu } from "./profile-menu";
import { ContextSwitcher } from "./context-switcher";
import { OrganizationBadge } from "./organization-badge";

interface AnalyticsTopbarProps {
  userName: string;
  userEmail: string;
  initials: string;
  /** Nome da organização ativa. `null` quando a sessão não tem org ativa. */
  orgName: string | null;
}

export function AnalyticsTopbar({
  userName,
  userEmail,
  initials,
  orgName,
}: AnalyticsTopbarProps) {
  return (
    <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between gap-4 border-b border-gray-100 bg-white/85 px-5 backdrop-blur md:px-10">
      <div className="flex items-center gap-3">
        <ContextSwitcher current="analytics" />
        {orgName && <OrganizationBadge name={orgName} />}
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          aria-label="Notificações"
          className="relative grid size-10 place-items-center rounded-xl text-gray-600 transition-colors hover:bg-gray-100 hover:text-ink"
        >
          <Bell className="size-[18px]" />
        </button>

        <div className="mx-2 h-6 w-px bg-gray-200" />

        <AnalyticsProfileMenu name={userName} email={userEmail} initials={initials} />
      </div>
    </header>
  );
}
