import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Building2, Instagram, Mail, MessageCircle } from "lucide-react";
import { Container } from "@/components/ui/container";
import {
  buildMailtoUrl,
  buildWhatsappUrl,
  MARKETING_WHATSAPP_MESSAGE,
  SUPPORT_CONTACTS,
} from "@/lib/support-contacts";

export const metadata: Metadata = {
  title: "Contato",
  description:
    "Fale com a Lucida pelo WhatsApp, e-mail ou Instagram. A gente responde rápido.",
};

const channels = [
  {
    icon: MessageCircle,
    label: "WhatsApp",
    value: SUPPORT_CONTACTS.whatsappDisplay,
    href: buildWhatsappUrl({ prefilledMessage: MARKETING_WHATSAPP_MESSAGE }),
    cta: "Conversar agora",
    accent: "bg-emerald-500/10 text-emerald-600",
  },
  {
    icon: Mail,
    label: "Email",
    value: SUPPORT_CONTACTS.email,
    href: buildMailtoUrl(),
    cta: "Mandar e-mail",
    accent: "bg-brand-primary/10 text-brand-primary",
  },
  {
    icon: Instagram,
    label: "Instagram",
    value: "@lucida.ia",
    href: "https://www.instagram.com/lucida.ia/",
    cta: "Seguir",
    accent: "bg-pink-500/10 text-pink-600",
  },
];

export default function ContactPage() {
  return (
    <section className="relative pb-24 pt-28 md:pb-32 md:pt-36">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(127,189,244,0.18),transparent_60%)]"
      />

      <Container size="default">
        <header className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.15em] text-gray-400">
            <span className="pulse-dot" />
            Fale com a gente
          </div>
          <h1 className="mt-5 text-4xl font-medium leading-[1.05] tracking-tighter text-ink md:text-6xl">
            A gente{" "}
            <span className="font-serif font-normal italic text-brand-primary">
              responde
            </span>
            .
          </h1>
          <p className="mt-4 text-lg text-gray-500">
            Dúvida, sugestão ou parceria — escolha o canal que preferir.
          </p>
        </header>

        <div className="mx-auto mt-12 grid max-w-4xl gap-4 md:grid-cols-3">
          {channels.map((c) => (
            <a
              key={c.label}
              href={c.href}
              target="_blank"
              rel="noreferrer"
              className="group flex flex-col gap-5 rounded-2xl border border-gray-100 bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-gray-200 hover:shadow-soft"
            >
              <div className="flex items-start justify-between">
                <span className={`grid size-11 place-items-center rounded-xl ${c.accent}`}>
                  <c.icon className="size-5" />
                </span>
                <ArrowUpRight className="size-4 text-gray-300 transition-colors group-hover:text-ink" />
              </div>
              <div>
                <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-400">
                  {c.label}
                </div>
                <div className="mt-1 text-base font-medium text-ink">{c.value}</div>
                <div className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-primary">
                  {c.cta}
                  <ArrowUpRight className="size-3.5" />
                </div>
              </div>
            </a>
          ))}
        </div>

        <div className="mx-auto mt-12 flex max-w-4xl flex-col gap-6 rounded-2xl border border-dashed border-brand-primary/20 bg-brand-primary/[0.03] p-8 text-center md:flex-row md:items-center md:justify-between md:text-left">
          <div className="flex items-start gap-4 md:items-center">
            <span className="hidden size-12 shrink-0 place-items-center rounded-xl bg-brand-primary/10 text-brand-primary md:grid">
              <Building2 className="size-5" />
            </span>
            <div>
              <h2 className="text-lg font-medium text-ink">
                Veio falar de uso institucional?
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Se você representa uma escola, cursinho, universidade ou rede,
                tem uma página feita pra você — com WhatsApp dedicado e
                informações sobre o Lucida Analytics.
              </p>
            </div>
          </div>
          <Link
            href="/contact/institutions"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-pill bg-ink px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-primary"
          >
            Para instituições
            <ArrowUpRight className="size-4" />
          </Link>
        </div>
      </Container>
    </section>
  );
}
