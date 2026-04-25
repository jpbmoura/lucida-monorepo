import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

const LINKS = [
  { label: "Como funciona", href: "/#how-it-works" },
  { label: "Recursos", href: "/#features" },
  { label: "Preços", href: "/precos" },
  { label: "Para instituições", href: "/contact/institutions" },
];

export function MarketingNavbar() {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-gray-100/60 bg-white/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/70">
      <nav className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-8 px-6 md:px-8">
        <Link href="/" className="flex items-center" aria-label="Ir para a página inicial da Lucida">
          <Logo priority />
        </Link>

        <ul className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="rounded-pill px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-ink"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-1.5">
          <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
            <Link href="/sign-in">Entrar</Link>
          </Button>
          <Button asChild variant="primary" size="sm">
            <Link href="/sign-up">Começar grátis</Link>
          </Button>
        </div>
      </nav>
    </header>
  );
}
