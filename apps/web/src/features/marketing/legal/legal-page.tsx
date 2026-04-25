import type { ReactNode } from "react";

interface LegalPageProps {
  eyebrow: string;
  title: string;
  titleEmphasis?: string;
  updatedAt: string;
  children: ReactNode;
}

/**
 * Container padrão pra páginas legais (Termos, Privacidade, etc).
 * Reaproveita o padrão visual do marketing — eyebrow + título tracking-tighter
 * + corpo com prose styling.
 */
export function LegalPage({
  eyebrow,
  title,
  titleEmphasis,
  updatedAt,
  children,
}: LegalPageProps) {
  return (
    <article className="mx-auto w-full max-w-3xl px-5 py-16 md:px-10 md:py-24">
      <header className="mb-10">
        <div className="mb-3 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.15em] text-gray-400">
          <span className="pulse-dot" />
          {eyebrow}
        </div>
        <h1 className="text-4xl font-medium leading-[1.05] tracking-tighter text-ink md:text-5xl">
          {title}
          {titleEmphasis && (
            <>
              {" "}
              <span className="font-serif font-normal italic text-brand-primary">
                {titleEmphasis}
              </span>
            </>
          )}
        </h1>
        <p className="mt-3 text-[13px] text-gray-400">
          Última atualização: {updatedAt}
        </p>
      </header>

      <div className="prose prose-gray max-w-none text-[15px] leading-relaxed text-gray-700">
        {children}
      </div>
    </article>
  );
}

/**
 * Seção individual dentro de uma página legal. H2 + corpo com mesma tipografia
 * que a prose da LegalPage.
 */
export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-10 first:mt-0">
      <h2 className="mb-3 text-lg font-medium tracking-tight text-ink">
        {title}
      </h2>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}
