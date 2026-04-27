import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Container } from "@/components/ui/container";
import {
  buildMailtoUrl,
  buildWhatsappUrl,
  MARKETING_WHATSAPP_MESSAGE,
} from "@/lib/support-contacts";

const PRODUCT = [
  { label: "Como funciona", href: "/#how-it-works" },
  { label: "Recursos", href: "/#features" },
  { label: "Preços", href: "/precos" },
  { label: "Roadmap", href: "/roadmap" },
];

const COMPANY = [
  { label: "Contato", href: "/contact" },
  { label: "Para instituições", href: "/contact/institutions" },
];

const LEGAL = [
  { label: "Termos de uso", href: "/termos" },
  { label: "Política de privacidade", href: "/privacidade" },
];

const SOCIAL = [
  { label: "Instagram", href: "https://www.instagram.com/lucida.ia/" },
  {
    label: "WhatsApp",
    href: buildWhatsappUrl({ prefilledMessage: MARKETING_WHATSAPP_MESSAGE }),
  },
  { label: "E-mail", href: buildMailtoUrl() },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-gray-100 bg-white py-16">
      <Container size="wide">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-5">
          <div className="col-span-2 flex flex-col gap-4 md:col-span-1">
            <Logo />
            <p className="max-w-[22ch] text-sm text-gray-500">
              A IA que devolve o tempo do professor.
            </p>
          </div>

          <FooterColumn title="Produto" links={PRODUCT} />
          <FooterColumn title="Empresa" links={COMPANY} />
          <FooterColumn title="Legal" links={LEGAL} />
          <FooterColumn title="Redes" links={SOCIAL} external />
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-gray-100 pt-8 text-xs text-gray-400 md:flex-row md:items-center">
          <span>© {new Date().getFullYear()} Lucida. Todos os direitos reservados.</span>
          <div className="flex items-center gap-4 text-gray-300">
            <Link href="/termos" className="transition-colors hover:text-gray-500">
              Termos
            </Link>
            <Link href="/privacidade" className="transition-colors hover:text-gray-500">
              Privacidade
            </Link>
          </div>
        </div>
      </Container>
    </footer>
  );
}

interface FooterColumnProps {
  title: string;
  links: Array<{ label: string; href: string }>;
  external?: boolean;
}

function FooterColumn({ title, links, external }: FooterColumnProps) {
  return (
    <div className="flex flex-col gap-3">
      <h5 className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">
        {title}
      </h5>
      <ul className="flex flex-col gap-2.5 text-sm text-gray-600">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              target={external ? "_blank" : undefined}
              rel={external ? "noopener noreferrer" : undefined}
              className="transition-colors hover:text-ink"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
