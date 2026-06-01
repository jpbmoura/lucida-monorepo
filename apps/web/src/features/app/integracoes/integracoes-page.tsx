import { Sparkles } from "lucide-react";
import { IntegrationsGrid } from "./components/integrations-grid";

export function IntegracoesPage() {
  return (
    <>
      <div className="border-b border-gray-100 pb-8">
        <div className="mb-3 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.15em] text-gray-400">
          <Sparkles className="size-3.5" />
          Conecte suas ferramentas
        </div>
        <h1 className="text-4xl font-medium leading-[1.05] tracking-tighter text-ink md:text-5xl">
          Integrações
        </h1>
        <p className="mt-3 max-w-md text-[15px] leading-relaxed text-gray-500">
          Conecte a Lucida a outras plataformas que você já usa. Em breve.
        </p>
      </div>

      <div className="mt-8">
        <IntegrationsGrid />
      </div>
    </>
  );
}
