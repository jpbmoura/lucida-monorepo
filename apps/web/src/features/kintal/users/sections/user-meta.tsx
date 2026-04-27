import type { KintalUserDetail } from "../types";

interface UserMetaProps {
  user: KintalUserDetail;
}

// Lateral com infos read-only que não fazem sentido editar (datas BA,
// flags de migração, listas multi-select que precisam do form do app
// settings pra funcionar bem). Server component — sem JS no cliente.
export function UserMeta({ user }: UserMetaProps) {
  return (
    <aside className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-6">
      <h3 className="text-sm font-medium tracking-tight text-ink">
        Informações da{" "}
        <span className="font-serif text-[1.1em] italic text-gray-500">
          conta
        </span>
      </h3>
      <dl className="flex flex-col gap-3 border-t border-gray-100 pt-3 text-xs">
        <Row label="ID" value={<code className="text-[10px] text-gray-500">{user.id}</code>} />
        <Row
          label="Cadastro"
          value={formatDate(user.createdAt)}
        />
        {user.updatedAt && (
          <Row label="Atualizado em" value={formatDate(user.updatedAt)} />
        )}
        <Row
          label="E-mail verificado"
          value={user.emailVerified ? "Sim" : "Não"}
        />
        {user.role && (
          <Row label="Role" value={<span className="capitalize">{user.role}</span>} />
        )}
        {user.staffSince && (
          <Row label="Staff desde" value={formatDate(user.staffSince)} />
        )}
        {user.gender && <Row label="Gênero" value={user.gender} />}
        {user.teachingLevels.length > 0 && (
          <Row
            label="Níveis"
            value={user.teachingLevels.join(", ")}
          />
        )}
        {user.subjects.length > 0 && (
          <Row label="Disciplinas" value={user.subjects.join(", ")} />
        )}
        {user.legacyClerkId && (
          <Row
            label="Clerk legacy"
            value={
              <code className="text-[10px] text-gray-500">
                {user.legacyClerkId}
              </code>
            }
          />
        )}
        {user.needsEmailUpdate && (
          <Row
            label="Precisa atualizar e-mail"
            value={
              <span className="rounded-pill bg-amber-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-amber-700">
                sim
              </span>
            }
          />
        )}
        {user.banned === true && (
          <Row
            label="Banido"
            value={
              <span className="rounded-pill bg-red-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-red-700">
                sim
              </span>
            }
          />
        )}
      </dl>
    </aside>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-[11px] uppercase tracking-[0.08em] text-gray-400">
        {label}
      </dt>
      <dd className="min-w-0 text-right text-xs text-gray-700">{value}</dd>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
