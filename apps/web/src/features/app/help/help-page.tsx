import { ContactForm } from "./components/contact-form";
import { ContactChannels } from "./components/contact-channels";
import { FaqSection } from "./components/faq-section";

interface HelpPageProps {
  userName: string;
  userEmail: string;
}

export function HelpPage({ userName, userEmail }: HelpPageProps) {
  return (
    <div className="mx-auto w-full px-5 py-8 md:px-10">
      <header className="mb-8">
        <div className="mb-2 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.15em] text-gray-400">
          <span className="pulse-dot" />
          Ajuda e suporte
        </div>
        <h1 className="text-3xl font-medium leading-tight tracking-tighter text-ink md:text-4xl">
          Como podemos{" "}
          <span className="font-serif font-normal italic text-brand-primary">
            ajudar
          </span>
          ?
        </h1>
        <p className="mt-2 max-w-xl text-[15px] text-gray-500">
          Envie uma mensagem pela gente ou fale direto no WhatsApp — respondemos
          em horário comercial.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <ContactForm userName={userName} userEmail={userEmail} />
        <ContactChannels userName={userName} />
      </div>

      <FaqSection />
    </div>
  );
}
