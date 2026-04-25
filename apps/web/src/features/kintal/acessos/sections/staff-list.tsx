import { buildDisplayUser } from "@/lib/user-display";
import { RevokeButton } from "../components/revoke-button";
import type { StaffMember } from "../types";

interface StaffListProps {
  members: StaffMember[];
  currentUserId: string;
}

// Lista de staff no shape dos painéis do Dashboard: rounded-2xl border +
// header com destaque serif italic. A "tabela" é implementada como uma
// lista de divs com grid fixo — simples de responsivizar (em mobile o
// staffSince vira texto secundário junto do nome).
export function StaffList({ members, currentUserId }: StaffListProps) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white">
      <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-7 py-6">
        <div>
          <h2 className="text-xl font-medium tracking-tight text-ink">
            Pessoas com{" "}
            <span className="font-serif text-[1.1em] italic text-gray-500">
              acesso
            </span>
          </h2>
          <p className="mt-0.5 text-[13px] text-gray-500">
            {members.length === 0
              ? "Ninguém com acesso ainda."
              : `${members.length} ${members.length === 1 ? "conta ativa" : "contas ativas"}.`}
          </p>
        </div>
      </div>

      {members.length === 0 ? (
        <EmptyState />
      ) : (
        <ul>
          {members.map((member, i) => (
            <li
              key={member.id}
              className={
                i < members.length - 1
                  ? "border-b border-gray-50"
                  : undefined
              }
            >
              <StaffRow
                member={member}
                isSelf={member.id === currentUserId}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StaffRow({
  member,
  isSelf,
}: {
  member: StaffMember;
  isSelf: boolean;
}) {
  const display = buildDisplayUser({
    name: member.name,
    email: member.email,
  });

  return (
    <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 px-7 py-4">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-ink to-gray-600 text-[12px] font-semibold text-white">
        {display.initials}
      </span>

      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="truncate text-sm font-medium text-ink">
            {display.name}
          </span>
          {isSelf && (
            <span className="shrink-0 rounded-pill bg-gray-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-gray-500">
              Você
            </span>
          )}
        </div>
        <div className="mt-0.5 truncate text-xs text-gray-500">
          {member.email}
        </div>
      </div>

      <div className="hidden shrink-0 text-right text-[11px] text-gray-400 sm:block">
        {formatStaffSince(member.staffSince)}
      </div>

      <RevokeButton
        userId={member.id}
        label={display.name}
        disabled={isSelf}
      />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-2 px-7 py-16 text-center">
      <p className="text-sm font-medium text-ink">
        Nenhum staff cadastrado.
      </p>
      <p className="max-w-sm text-[13px] text-gray-500">
        Use o botão "Dar acesso" pra conceder permissão a uma conta
        existente na Lucida.
      </p>
    </div>
  );
}

function formatStaffSince(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  return `desde ${date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  })}`;
}
