import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

interface RoadmapTopbarProps {
  isAuthenticated: boolean;
  userName: string | null;
}

// Header próprio do /roadmap — não puxa o navbar de marketing porque
// queremos o roadmap acessível tanto pra quem entra deslogado da LP
// quanto pra quem clica do app autenticado. Mostra um Link "Entrar" / nome
// do user dependendo da sessão.
export function RoadmapTopbar({
  isAuthenticated,
  userName,
}: RoadmapTopbarProps) {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-gray-100/60 bg-white/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/70">
      <nav className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-6 px-6 md:px-8">
        <Link
          href="/"
          className="flex items-center"
          aria-label="Ir para a página inicial"
        >
          <Logo />
        </Link>
        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              <span className="hidden text-sm text-gray-500 md:inline">
                {userName}
              </span>
              <Button asChild variant="ghost" size="sm">
                <Link href="/app">Voltar pro app</Link>
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
                <Link
                  href={`/sign-in?next=${encodeURIComponent("/roadmap")}`}
                >
                  Entrar
                </Link>
              </Button>
              <Button asChild variant="primary" size="sm">
                <Link href="/sign-up">Começar grátis</Link>
              </Button>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
