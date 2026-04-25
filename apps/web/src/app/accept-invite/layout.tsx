import Link from "next/link";
import { Logo } from "@/components/brand/logo";

/**
 * Shell minimalista pra /accept-invite — é um fluxo curto (1 page), não
 * precisa de sidebar/topbar. Visual azul Exam: o destino do professor é o
 * `/app`, então introduzir a paleta roxa aqui criaria expectativa errada.
 */
export default function AcceptInviteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="flex items-center px-6 py-6 md:px-10">
        <Link href="/" aria-label="Ir para a página inicial" className="inline-flex">
          <Logo priority />
        </Link>
      </header>

      <main className="flex flex-1 items-start justify-center px-6 py-4 pb-12 md:items-center md:py-12">
        <div className="w-full max-w-lg">{children}</div>
      </main>
    </div>
  );
}
