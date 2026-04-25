import { ContactForm } from "@/features/app/help/components/contact-form";
import { FaqSection } from "@/features/app/help/components/faq-section";
import { InstitutionalContactChannels } from "./components/institutional-contact-channels";
import { INSTITUTIONAL_FAQ_ITEMS } from "./faq-data";

interface InstitutionalHelpPageProps {
  userName: string;
  userEmail: string;
  orgName: string | null;
}

const INSTITUTIONAL_CATEGORIES = [
  { value: "duvida_admin", label: "Dúvida de administração" },
  { value: "gestao_professores", label: "Gestão de professores (convites/acessos)" },
  { value: "billing_institucional", label: "Billing / créditos institucionais" },
  { value: "problema", label: "Problema técnico" },
  { value: "sugestao", label: "Sugestão / feature request" },
  { value: "outro", label: "Outro" },
] as const;

export function InstitutionalHelpPage({
  userName,
  userEmail,
  orgName,
}: InstitutionalHelpPageProps) {
  return (
    <div className="mx-auto w-full px-5 py-8 md:px-10">
      <header className="mb-8">
        <div className="mb-2 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.15em] text-gray-400">
          <span className="pulse-dot" />
          Ajuda e suporte — instituição
        </div>
        <h1 className="text-3xl font-medium leading-tight tracking-tighter text-ink md:text-4xl">
          Como podemos{" "}
          <span className="font-serif font-normal italic text-analytics-primary">
            ajudar
          </span>
          ?
        </h1>
        <p className="mt-2 max-w-xl text-[15px] text-gray-500">
          Dúvidas de administração, recarga de créditos, mudança de modo de
          cobrança ou qualquer coisa da instituição — mande pela gente.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <ContactForm
          userName={userName}
          userEmail={userEmail}
          categories={[...INSTITUTIONAL_CATEGORIES]}
        />
        <InstitutionalContactChannels userName={userName} orgName={orgName} />
      </div>

      <FaqSection
        items={INSTITUTIONAL_FAQ_ITEMS}
        title="Respostas rápidas pras dúvidas de administradores"
      />
    </div>
  );
}
