import { Mail, Clock } from "lucide-react";
import type { InvitationDTO } from "../data";
import { CancelInvitationButton } from "./cancel-invitation-button";

interface InvitationsListProps {
  invitations: InvitationDTO[];
}

export function InvitationsList({ invitations }: InvitationsListProps) {
  if (invitations.length === 0) return null;

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-dashed border-analytics-primary/30 bg-analytics-primary/5 p-6">
      <header className="flex items-center gap-2.5">
        <span className="grid size-8 place-items-center rounded-lg bg-white text-analytics-primary">
          <Mail className="size-4" />
        </span>
        <div className="flex flex-col">
          <h2 className="text-sm font-semibold tracking-tight text-ink">
            Convites pendentes
          </h2>
          <p className="text-xs text-gray-500">
            {invitations.length === 1
              ? "1 convite aguardando aceite"
              : `${invitations.length} convites aguardando aceite`}
          </p>
        </div>
      </header>

      <ul className="flex flex-col divide-y divide-analytics-primary/15">
        {invitations.map((inv) => (
          <li
            key={inv.id}
            className="flex items-center gap-4 py-3 first:pt-0 last:pb-0"
          >
            <div className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-analytics-primary">
              <Mail className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-ink">
                {inv.email}
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
                <span className="truncate">
                  convidado por {inv.inviterName}
                </span>
                <span aria-hidden>·</span>
                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                  <Clock className="size-3" />
                  expira {formatExpiry(inv.expiresAt)}
                </span>
              </div>
            </div>

            <CancelInvitationButton invitationId={inv.id} email={inv.email} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function formatExpiry(iso: string): string {
  const then = new Date(iso);
  const now = Date.now();
  const diffMs = then.getTime() - now;
  if (diffMs <= 0) return "hoje";
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  if (diffHours < 24) return `em ${diffHours}h`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays === 1) return "em 1 dia";
  return `em ${diffDays} dias`;
}
