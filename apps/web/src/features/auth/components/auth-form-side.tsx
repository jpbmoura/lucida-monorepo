import Link from "next/link";
import { Logo } from "@/components/brand/logo";

interface AuthFormSideProps {
  variant?: "exam" | "analytics";
  children: React.ReactNode;
}

/**
 * Coluna esquerda do layout de auth — logo no topo, form no centro, footer.
 * A variante `analytics` troca o logo e aplica `.theme-analytics` no wrapper,
 * o que faz o form (inputs, focus ring, etc) herdar a paleta roxa sem cada
 * input precisar de variant próprio.
 */
export function AuthFormSide({ variant = "exam", children }: AuthFormSideProps) {
  const isAnalytics = variant === "analytics";

  return (
    <div
      className={
        "relative flex flex-col px-6 py-8 md:px-12 md:py-10" +
        (isAnalytics ? " theme-analytics" : "")
      }
    >
      <Link
        href="/"
        aria-label="Ir para a página inicial"
        className="inline-flex"
      >
        <Logo variant={isAnalytics ? "analytics" : "default"} priority />
      </Link>

      <div className="flex flex-1 items-center justify-center py-10">
        <div className="w-full max-w-sm">{children}</div>
      </div>

      <footer className="text-xs text-gray-400">
        © {new Date().getFullYear()} Lucida · lucidaexam.com
      </footer>
    </div>
  );
}
