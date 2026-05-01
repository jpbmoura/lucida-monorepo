import Link from "next/link";
import {
  AtSign,
  Building2,
  Calendar,
  ClipboardList,
  Coins,
  Crown,
  ExternalLink,
  Inbox,
  ShieldCheck,
  Sparkles,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/relative-time";
import {
  PLAN_LABELS,
  ROLE_LABELS,
  type KintalUserDetail,
} from "@/features/kintal/users/types";
import type { RelatedTicketDTO, TicketStatus } from "../data";

interface Props {
  customerEmail: string;
  customerName: string | null;
  /** Cadastro Lucida do remetente, se houver. */
  user: KintalUserDetail | null;
  /** Fallback pra "primeiro contato" quando não é cliente. */
  ticketCreatedAt: string;
  relatedTickets: RelatedTicketDTO[];
}

/**
 * Painel lateral fixo no detalhe do email. Mostra perfil rico quando o
 * remetente está cadastrado na Lucida; quando não está, mostra apenas
 * domínio do email e o histórico de outros emails que recebemos dele.
 */
export function InfoPanel({
  customerEmail,
  customerName,
  user,
  ticketCreatedAt,
  relatedTickets,
}: Props) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-5">
      {user ? (
        <CustomerView user={user} relatedTickets={relatedTickets} />
      ) : (
        <NonCustomerView
          customerEmail={customerEmail}
          customerName={customerName}
          ticketCreatedAt={ticketCreatedAt}
          relatedTickets={relatedTickets}
        />
      )}
    </div>
  );
}

// ─── Customer (cadastrado) ──────────────────────────────────────────

function CustomerView({
  user,
  relatedTickets,
}: {
  user: KintalUserDetail;
  relatedTickets: RelatedTicketDTO[];
}) {
  const planLabel = user.subscription
    ? PLAN_LABELS[user.subscription.planId] ?? user.subscription.planId
    : null;
  const isStaff = user.role === "staff";

  return (
    <>
      {/* Avatar + identidade */}
      <header className="flex items-start gap-3">
        <Avatar
          src={user.image}
          name={user.name ?? user.email}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-sm font-semibold text-ink">
              {user.name ?? "(sem nome)"}
            </h3>
            {isStaff && (
              <span
                title="Staff"
                className="inline-flex items-center rounded-md bg-brand-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-brand-primary"
              >
                <ShieldCheck className="size-3" />
              </span>
            )}
          </div>
          <a
            href={`mailto:${user.email}`}
            className="block truncate text-[12px] text-gray-500 hover:text-ink"
          >
            {user.email}
          </a>
        </div>
      </header>

      <Divider />

      {/* Plano + saldo */}
      <section className="grid grid-cols-2 gap-3">
        <Stat
          icon={Crown}
          label="Plano"
          value={planLabel ?? "Sem assinatura"}
          tone={planLabel ? "brand" : "muted"}
        />
        <Stat
          icon={Coins}
          label="Créditos"
          value={formatInt(user.creditBalance)}
        />
      </section>

      {/* Organizações */}
      {user.organizations.length > 0 && (
        <>
          <Divider />
          <section>
            <SectionLabel icon={Building2}>
              Organização{user.organizations.length > 1 ? "ões" : ""}
            </SectionLabel>
            <ul className="flex flex-col gap-1.5">
              {user.organizations.map((org) => (
                <li
                  key={org.id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-2.5 py-1.5"
                >
                  <span className="truncate text-[12px] text-ink">
                    {org.name}
                  </span>
                  <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-gray-500">
                    {ROLE_LABELS[org.role] ?? org.role}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      <Divider />

      {/* Engajamento */}
      <section>
        <SectionLabel icon={Sparkles}>Atividade</SectionLabel>
        <div className="grid grid-cols-2 gap-2">
          <CompactKpi
            label="Provas"
            value={formatInt(user.engagement.examsCount)}
          />
          <CompactKpi
            label="Turmas"
            value={formatInt(user.engagement.classesCount)}
          />
          <CompactKpi
            label="Alunos"
            value={formatInt(user.engagement.studentsCount)}
          />
          <CompactKpi
            label="Submissões"
            value={formatInt(user.engagement.submissionsCount)}
          />
        </div>
      </section>

      <Divider />

      {/* Datas */}
      <section className="flex flex-col gap-1.5 text-[12px]">
        <Row
          icon={Calendar}
          label="Cadastrado"
          value={formatDate(user.createdAt)}
        />
        <Row
          icon={Inbox}
          label="Última atividade"
          value={
            user.engagement.lastActivityAt
              ? formatRelativeTime(user.engagement.lastActivityAt)
              : "—"
          }
        />
      </section>

      {/* Histórico de emails */}
      {relatedTickets.length > 0 && (
        <>
          <Divider />
          <RelatedTicketsList items={relatedTickets} />
        </>
      )}

      <Divider />

      <Link
        href={`/kintal/usuarios/${user.id}`}
        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-ink px-3 py-2 text-[12px] font-medium text-white transition-colors hover:bg-ink/90"
      >
        Ver perfil completo
        <ExternalLink className="size-3" />
      </Link>
    </>
  );
}

// ─── Non-customer ───────────────────────────────────────────────────

function NonCustomerView({
  customerEmail,
  customerName,
  ticketCreatedAt,
  relatedTickets,
}: {
  customerEmail: string;
  customerName: string | null;
  ticketCreatedAt: string;
  relatedTickets: RelatedTicketDTO[];
}) {
  const domain = customerEmail.split("@")[1] ?? null;
  const firstContact =
    relatedTickets.length > 0
      ? relatedTickets[relatedTickets.length - 1]?.updatedAt
      : ticketCreatedAt;

  return (
    <>
      <header className="flex items-start gap-3">
        <Avatar src={null} name={customerName ?? customerEmail} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-ink">
            {customerName ?? "(sem nome)"}
          </h3>
          <a
            href={`mailto:${customerEmail}`}
            className="block truncate text-[12px] text-gray-500 hover:text-ink"
          >
            {customerEmail}
          </a>
        </div>
      </header>

      <div className="inline-flex w-fit items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700">
        <UserPlus className="size-3" />
        Sem cadastro na Lucida
      </div>

      <Divider />

      <section className="flex flex-col gap-1.5 text-[12px]">
        {domain && (
          <Row icon={AtSign} label="Domínio" value={domain} valueMono />
        )}
        <Row
          icon={Calendar}
          label="Primeiro contato"
          value={formatRelativeTime(firstContact ?? ticketCreatedAt)}
        />
        <Row
          icon={Inbox}
          label="Total de emails"
          value={formatInt(relatedTickets.length + 1)}
        />
      </section>

      {relatedTickets.length > 0 && (
        <>
          <Divider />
          <RelatedTicketsList items={relatedTickets} />
        </>
      )}
    </>
  );
}

// ─── Shared bits ────────────────────────────────────────────────────

function RelatedTicketsList({ items }: { items: RelatedTicketDTO[] }) {
  return (
    <section>
      <SectionLabel icon={ClipboardList}>
        Outros emails {items.length > 0 && `(${items.length})`}
      </SectionLabel>
      <ul className="flex flex-col gap-1.5">
        {items.map((t) => (
          <li key={t.id}>
            <Link
              href={`/kintal/emails/${t.id}`}
              className="group flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-2.5 py-1.5 transition-colors hover:bg-gray-100"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12px] text-ink group-hover:text-ink">
                  {t.subject || "(sem assunto)"}
                </div>
                <div className="text-[10px] text-gray-500">
                  {formatRelativeTime(t.updatedAt)}
                </div>
              </div>
              <RelatedStatusDot status={t.status} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function RelatedStatusDot({ status }: { status: TicketStatus }) {
  const tone =
    status === "new"
      ? "bg-emerald-500"
      : status === "in_progress"
        ? "bg-amber-500"
        : "bg-gray-300";
  const label =
    status === "new"
      ? "Novo"
      : status === "in_progress"
        ? "Em andamento"
        : "Concluído";
  return (
    <span
      title={label}
      aria-label={label}
      className={cn("size-2 shrink-0 rounded-full", tone)}
    />
  );
}

function Avatar({
  src,
  name,
}: {
  src: string | null;
  name: string;
}) {
  const initials = computeInitials(name);
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        className="size-10 shrink-0 rounded-full bg-gray-100 object-cover"
      />
    );
  }
  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-primary/10 text-[12px] font-semibold text-brand-primary">
      {initials}
    </span>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: "brand" | "muted";
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-gray-100 px-3 py-2">
      <div className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-gray-500">
        <Icon className="size-3" />
        {label}
      </div>
      <div
        className={cn(
          "truncate text-[13px] font-semibold tabular-nums",
          tone === "muted" ? "text-gray-500" : "text-ink",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function CompactKpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg bg-gray-50 px-2.5 py-1.5">
      <span className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
        {label}
      </span>
      <span className="text-base font-medium leading-none text-ink tabular-nums">
        {value}
      </span>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  value,
  valueMono,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  valueMono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="inline-flex items-center gap-1.5 text-gray-500">
        <Icon className="size-3" />
        {label}
      </span>
      <span
        className={cn(
          "truncate text-ink",
          valueMono && "font-mono text-[11px]",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function SectionLabel({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <h4 className="mb-2 inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-gray-500">
      <Icon className="size-3" />
      {children}
    </h4>
  );
}

function Divider() {
  return <div className="h-px w-full bg-gray-100" />;
}

function computeInitials(raw: string): string {
  const cleaned = raw.replace(/[^A-Za-zÀ-ÿ\s]/g, " ").trim();
  if (!cleaned) return "?";
  const parts = cleaned.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

function formatInt(n: number): string {
  return new Intl.NumberFormat("pt-BR").format(n);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

