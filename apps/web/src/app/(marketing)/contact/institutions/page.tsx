import type { Metadata } from "next";
import {
  ArrowUpRight,
  Building2,
  CheckCircle2,
  GraduationCap,
  LayoutGrid,
  Mail,
  MessageCircle,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { AnalyticsMockup } from "@/features/marketing/components/analytics-mockup";
import { InstitutionalContactForm } from "@/features/marketing/contact/institutional-contact-form";
import {
  buildMailtoUrl,
  buildWhatsappUrl,
  SUPPORT_CONTACTS,
} from "@/lib/support-contacts";

export const metadata: Metadata = {
  title: "Para instituições — Lucida Analytics",
  description:
    "Plano institucional da Lucida para escolas, cursinhos, universidades e redes de ensino. Gestão de equipe, saldo compartilhado e visão consolidada.",
};

const WHATSAPP_MSG =
  "Olá, sou de uma instituição e gostaria de conhecer a Lucida e o Analytics.";
const SCHEDULE_MSG =
  "Olá, gostaria de agendar uma conversa sobre o Lucida Analytics.";

export default function InstitutionsContactPage() {
  const whatsappUrl = buildWhatsappUrl({ prefilledMessage: WHATSAPP_MSG });
  const scheduleUrl = buildWhatsappUrl({ prefilledMessage: SCHEDULE_MSG });
  const mailtoUrl = buildMailtoUrl("Plano Institucional Lucida");

  return (
    <>
      <InstitutionsHero whatsappUrl={whatsappUrl} scheduleUrl={scheduleUrl} />
      <InstitutionsBenefits />
      <InstitutionsContact whatsappUrl={whatsappUrl} mailtoUrl={mailtoUrl} />
    </>
  );
}

/* ─────────────────────────────────────────── HERO ────────── */

interface HeroProps {
  whatsappUrl: string;
  scheduleUrl: string;
}

function InstitutionsHero({ whatsappUrl, scheduleUrl }: HeroProps) {
  return (
    <section className="relative overflow-hidden bg-brand-super-dark py-20 text-white md:py-28 lg:py-32">
      {/* ambientes roxos do Analytics — mais presentes que na home */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -right-40 size-[640px] rounded-full bg-analytics-primary/35 blur-[140px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-32 size-[480px] rounded-full bg-analytics-dark-01/25 blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-analytics-light/30 to-transparent"
      />

      <Container size="wide">
        <div className="relative grid grid-cols-1 items-center gap-14 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          <div>
            <div className="inline-flex items-center gap-2 rounded-pill border border-analytics-primary/30 bg-analytics-primary/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-analytics-light">
              <Building2 className="size-3" />
              Lucida Analytics
            </div>

            <h1 className="mt-6 text-4xl font-medium leading-[1] tracking-tighter text-white md:text-6xl lg:text-[clamp(3rem,5.5vw,4.75rem)]">
              A Lucida para a sua{" "}
              <span className="font-serif font-normal italic text-analytics-light">
                instituição
              </span>
              .
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/70 md:text-xl">
              Escolas, cursinhos, universidades e redes de ensino — com o time
              pedagógico todo no mesmo painel, saldo compartilhado e visão
              consolidada do desempenho.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-[13px] text-white/60">
              {[
                "Pool de créditos institucional",
                "Análises consolidadas",
                "Onboarding dedicado",
              ].map((item) => (
                <span key={item} className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5 text-analytics-light" />
                  {item}
                </span>
              ))}
            </div>

            <div className="mt-10 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row">
              <Button
                asChild
                size="xl"
                className="w-full bg-analytics-primary text-white shadow-soft hover:bg-analytics-dark-01 sm:w-auto"
              >
                <a href={whatsappUrl} target="_blank" rel="noreferrer">
                  <MessageCircle />
                  Conversar no WhatsApp
                </a>
              </Button>
              <Button
                asChild
                variant="ghost"
                size="xl"
                className="w-full text-white/80 hover:bg-white/10 hover:text-white sm:w-auto"
              >
                <a href={scheduleUrl} target="_blank" rel="noreferrer">
                  Agendar uma conversa
                </a>
              </Button>
            </div>
          </div>

          <div className="relative">
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-x-6 -inset-y-10 -z-10 rounded-[3rem] bg-[radial-gradient(ellipse_at_center,rgba(108,60,251,0.25),transparent_70%)]"
            />
            <AnalyticsMockup />
          </div>
        </div>
      </Container>
    </section>
  );
}

/* ───────────────────────────────────── BENEFITS ────────── */

function InstitutionsBenefits() {
  return (
    <section className="relative py-20 md:py-28">
      <Container size="wide">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.15em] text-gray-400">
            <span className="size-1.5 rounded-full bg-analytics-primary" />
            O que vem junto
          </div>
          <h2 className="mt-4 text-3xl font-medium leading-[1.05] tracking-tighter text-ink md:text-5xl">
            Recursos pensados para{" "}
            <span className="font-serif font-normal italic text-analytics-primary">
              quem coordena
            </span>
            .
          </h2>
          <p className="mt-4 text-lg text-gray-500">
            Tudo que o time pedagógico precisa, sem o caos de cinco
            ferramentas paralelas.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <PoolCard />
          <TeamCard />
          <AnalyticsCard />
          <MultiUnitCard />
          <OnboardingCard />
        </div>
      </Container>
    </section>
  );
}

function PoolCard() {
  return (
    <article className="relative flex flex-col gap-6 overflow-hidden rounded-2xl border border-analytics-primary/15 bg-white p-7 shadow-soft md:p-8 lg:col-span-7">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-24 size-[360px] rounded-full bg-[radial-gradient(circle,rgba(108,60,251,0.1),transparent_70%)]"
      />

      <div className="relative flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-analytics-primary/10 text-analytics-primary">
          <Wallet className="size-5" />
        </span>
        <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-gray-400">
          Pool institucional
        </span>
      </div>

      <div className="relative">
        <h3 className="text-2xl font-medium tracking-tight text-ink md:text-3xl">
          Saldo compartilhado pela{" "}
          <span className="font-serif italic text-analytics-primary">
            equipe toda
          </span>
        </h3>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-gray-500 md:text-base">
          Em vez de plano por professor, a instituição recarrega um pool único
          de créditos. Todo mundo usa, você acompanha tudo num só lugar.
        </p>
      </div>

      <PoolVisual />
    </article>
  );
}

function PoolVisual() {
  const teachers = [
    { name: "Wanderson S.", pct: 92 },
    { name: "Renata F.", pct: 78 },
    { name: "Carlos A.", pct: 64 },
    { name: "Ana Beatriz", pct: 41 },
  ];
  return (
    <div className="relative grid gap-4 rounded-2xl border border-gray-100 bg-gray-50/60 p-5 sm:grid-cols-2">
      <div>
        <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-gray-400">
          Saldo institucional
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="font-serif text-3xl italic leading-none text-analytics-primary">
            4.820
          </span>
          <span className="text-xs text-gray-400">créditos</span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-200/70">
          <div
            className="h-full rounded-full bg-analytics-primary"
            style={{ width: "62%" }}
          />
        </div>
        <div className="mt-1.5 text-[10px] text-gray-400">
          62% restantes do ciclo
        </div>
      </div>

      <div>
        <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-gray-400">
          Distribuição
        </div>
        <ul className="mt-2 flex flex-col gap-1.5">
          {teachers.map((t) => (
            <li key={t.name} className="flex items-center gap-2">
              <span className="w-20 shrink-0 truncate text-[11px] text-gray-500">
                {t.name}
              </span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200/70">
                <div
                  className="h-full rounded-full bg-analytics-light"
                  style={{ width: `${t.pct}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function TeamCard() {
  return (
    <article className="flex flex-col gap-5 rounded-2xl border border-gray-100 bg-white p-7 shadow-soft md:p-8 lg:col-span-5">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-analytics-primary/10 text-analytics-primary">
          <Users className="size-5" />
        </span>
        <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-gray-400">
          Gestão de equipe
        </span>
      </div>

      <div>
        <h3 className="text-xl font-medium tracking-tight text-ink md:text-2xl">
          Convide professores em{" "}
          <span className="font-serif italic text-analytics-primary">
            um clique
          </span>
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-gray-500">
          Defina quem pode criar, quem pode publicar e quem pode ver os
          números. Cada novo membro entra direto no pool.
        </p>
      </div>

      <div className="mt-auto flex flex-col gap-1.5">
        {[
          { name: "Wanderson Schneider", role: "Professor", color: "bg-emerald-100 text-emerald-700" },
          { name: "Renata Faria", role: "Professora · Coord.", color: "bg-analytics-primary/15 text-analytics-primary" },
          { name: "Convidar professor…", role: "", color: "" },
        ].map((m, i) => {
          if (!m.role) {
            return (
              <button
                key={i}
                type="button"
                tabIndex={-1}
                aria-hidden
                className="flex items-center gap-2 rounded-xl border border-dashed border-analytics-primary/30 bg-analytics-primary/5 px-3 py-2 text-left text-[12px] font-medium text-analytics-primary"
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-lg border border-dashed border-analytics-primary/40">
                  +
                </span>
                {m.name}
              </button>
            );
          }
          return (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl border border-gray-100 px-3 py-2"
            >
              <span
                className={`grid size-7 shrink-0 place-items-center rounded-full text-[10px] font-semibold ${m.color}`}
              >
                {m.name
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")}
              </span>
              <div className="flex-1 leading-tight">
                <div className="text-[12px] font-medium text-ink">{m.name}</div>
                <div className="text-[10px] text-gray-500">{m.role}</div>
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function AnalyticsCard() {
  const bars = [
    { label: "9º A", pct: 88 },
    { label: "9º B", pct: 74 },
    { label: "EM 1", pct: 61 },
    { label: "EM 2", pct: 79 },
  ];
  return (
    <article className="flex flex-col gap-5 rounded-2xl border border-gray-100 bg-white p-7 shadow-soft md:p-8 lg:col-span-5">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-analytics-primary/10 text-analytics-primary">
          <TrendingUp className="size-5" />
        </span>
        <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-gray-400">
          Análises consolidadas
        </span>
      </div>

      <div>
        <h3 className="text-xl font-medium tracking-tight text-ink md:text-2xl">
          KPIs por escola, série e{" "}
          <span className="font-serif italic text-analytics-primary">
            disciplina
          </span>
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-gray-500">
          Identifique padrões antes que virem problema. A leitura agregada
          mostra onde o time precisa de apoio.
        </p>
      </div>

      <div className="mt-auto rounded-xl border border-gray-100 bg-gray-50/60 p-4">
        <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-gray-400">
          Aprovação por turma
        </div>
        <ul className="mt-3 flex flex-col gap-1.5">
          {bars.map((b) => (
            <li key={b.label} className="flex items-center gap-2">
              <span className="w-10 shrink-0 text-[11px] text-gray-500">
                {b.label}
              </span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200/70">
                <div
                  className="h-full rounded-full bg-analytics-primary"
                  style={{ width: `${b.pct}%` }}
                />
              </div>
              <span className="w-7 text-right text-[10px] tabular-nums text-gray-500">
                {b.pct}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

function MultiUnitCard() {
  const units = [
    { name: "Unidade Centro", members: 18, color: "bg-analytics-primary" },
    { name: "Unidade Zona Sul", members: 12, color: "bg-analytics-light" },
    { name: "Unidade Litoral", members: 7, color: "bg-analytics-dark-01" },
  ];
  return (
    <article className="flex flex-col gap-5 rounded-2xl border border-gray-100 bg-white p-7 shadow-soft md:p-8 lg:col-span-7">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-analytics-primary/10 text-analytics-primary">
          <LayoutGrid className="size-5" />
        </span>
        <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-gray-400">
          Multi-unidade
        </span>
      </div>

      <div>
        <h3 className="text-xl font-medium tracking-tight text-ink md:text-2xl">
          Para redes com{" "}
          <span className="font-serif italic text-analytics-primary">
            várias escolas
          </span>
        </h3>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-gray-500">
          Organize professores por unidade, compare desempenho entre escolas e
          mantenha a operação centralizada — sem perder a autonomia local.
        </p>
      </div>

      <div className="mt-auto grid gap-2 sm:grid-cols-3">
        {units.map((u) => (
          <div
            key={u.name}
            className="rounded-xl border border-gray-100 bg-gray-50/40 p-3"
          >
            <div className="flex items-center gap-2">
              <span className={`size-2 rounded-full ${u.color}`} />
              <span className="text-[11px] font-medium text-ink">{u.name}</span>
            </div>
            <div className="mt-1 text-[10px] text-gray-500">
              {u.members} professores
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function OnboardingCard() {
  return (
    <article className="flex flex-col items-start gap-6 rounded-2xl border border-dashed border-analytics-primary/30 bg-analytics-primary/[0.04] p-7 md:flex-row md:items-center md:justify-between md:p-8 lg:col-span-12">
      <div className="flex items-start gap-4 md:items-center">
        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-analytics-primary/15 text-analytics-primary">
          <GraduationCap className="size-5" />
        </span>
        <div>
          <h3 className="text-lg font-medium text-ink md:text-xl">
            Implantação dedicada — a gente não some depois do contrato
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-600 md:text-base">
            Importação de turmas, treinamento dos professores e integração com
            sistemas internos quando necessário. Acompanhamento direto com
            quem entende do produto.
          </p>
        </div>
      </div>
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-pill bg-analytics-primary px-4 py-2 text-[12px] font-medium text-white">
        <CheckCircle2 className="size-3.5" />
        Sem custo extra
      </span>
    </article>
  );
}

/* ────────────────────────────── CONTACT (form + canais) ────────── */

interface ContactProps {
  whatsappUrl: string;
  mailtoUrl: string;
}

function InstitutionsContact({ whatsappUrl, mailtoUrl }: ContactProps) {
  return (
    <section className="border-t border-gray-100 bg-gray-50 py-20 md:py-24">
      <Container size="wide">
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-5">
          <aside className="flex flex-col gap-4 md:col-span-2">
            <header>
              <h2 className="text-3xl font-medium leading-[1.05] tracking-tighter text-ink md:text-4xl">
                Vamos{" "}
                <span className="font-serif font-normal italic text-analytics-primary">
                  conversar
                </span>
                .
              </h2>
              <p className="mt-3 text-gray-600">
                Manda uma mensagem ou fala direto no WhatsApp — o que for
                melhor pra você.
              </p>
            </header>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="group relative flex flex-col gap-4 overflow-hidden rounded-2xl bg-analytics-primary p-6 text-white shadow-soft transition-transform hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between gap-4">
                <span className="grid size-10 place-items-center rounded-xl bg-white/15 backdrop-blur">
                  <MessageCircle className="size-5" />
                </span>
                <ArrowUpRight className="size-5 opacity-60 transition-opacity group-hover:opacity-100" />
              </div>
              <div>
                <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-white/70">
                  WhatsApp institucional
                </div>
                <div className="mt-1 text-lg font-medium leading-tight">
                  Falar direto com o time
                </div>
                <div className="mt-1 text-[13px] text-white/80">
                  {SUPPORT_CONTACTS.whatsappDisplay}
                </div>
              </div>
            </a>

            <a
              href={mailtoUrl}
              className="group flex items-start gap-4 rounded-2xl border border-gray-100 bg-white p-6 transition-colors hover:border-gray-200"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gray-100 text-gray-600">
                <Mail className="size-5" />
              </span>
              <div className="flex-1">
                <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-400">
                  E-mail direto
                </div>
                <div className="mt-1 text-sm font-medium text-ink">
                  {SUPPORT_CONTACTS.email}
                </div>
                <p className="mt-1 text-[12px] text-gray-500">
                  Pra mensagens longas ou com anexos (contratos, propostas).
                </p>
              </div>
              <ArrowUpRight className="size-4 shrink-0 text-gray-400 transition-colors group-hover:text-ink" />
            </a>

            <div className="rounded-2xl border border-dashed border-gray-200 bg-white/40 p-5 text-[12px] text-gray-500">
              <strong className="block text-ink">
                Horário de atendimento
              </strong>
              Segunda a sexta, 9h às 18h (horário de Brasília). Mensagens fora
              do horário são respondidas no próximo dia útil.
            </div>
          </aside>

          <div className="md:col-span-3">
            <InstitutionalContactForm />
          </div>
        </div>
      </Container>
    </section>
  );
}
