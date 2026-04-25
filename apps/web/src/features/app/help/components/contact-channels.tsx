import { ArrowUpRight, Mail, MessageCircle } from "lucide-react";
import {
  SUPPORT_CONTACTS,
  buildAppSupportMessage,
  buildMailtoUrl,
  buildWhatsappUrl,
} from "@/lib/support-contacts";

interface ContactChannelsProps {
  userName: string;
}

export function ContactChannels({ userName }: ContactChannelsProps) {
  const whatsappUrl = buildWhatsappUrl({
    prefilledMessage: buildAppSupportMessage(userName),
  });
  const mailtoUrl = buildMailtoUrl("Suporte Lucida");

  return (
    <aside className="flex flex-col gap-4">
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative flex flex-col gap-4 overflow-hidden rounded-2xl bg-[#128C7E] p-6 text-white shadow-soft transition-transform hover:-translate-y-0.5"
      >
        <div className="flex items-start justify-between gap-4">
          <span className="grid size-10 place-items-center rounded-xl bg-white/15 backdrop-blur">
            <MessageCircle className="size-5" />
          </span>
          <ArrowUpRight className="size-5 opacity-60 transition-opacity group-hover:opacity-100" />
        </div>
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-white/60">
            WhatsApp — atendimento rápido
          </div>
          <div className="mt-1 text-lg font-medium leading-tight">
            Falar com a Lucida agora
          </div>
          <div className="mt-1 text-[13px] text-white/70">
            {SUPPORT_CONTACTS.whatsappDisplay}
          </div>
        </div>
      </a>

      <a
        href={mailtoUrl}
        className="group flex items-start gap-4 rounded-2xl border border-gray-100 bg-white p-6 transition-colors hover:border-gray-200 hover:bg-gray-50"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gray-100 text-gray-600">
          <Mail className="size-5" />
        </span>
        <div className="flex-1">
          <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-400">
            Email direto
          </div>
          <div className="mt-1 text-sm font-medium text-ink">
            {SUPPORT_CONTACTS.email}
          </div>
          <p className="mt-1 text-[12px] text-gray-500">
            Pra mensagens mais longas ou com anexos.
          </p>
        </div>
        <ArrowUpRight className="size-4 shrink-0 text-gray-400 transition-colors group-hover:text-ink" />
      </a>

      <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/40 p-5 text-[12px] text-gray-500">
        <strong className="block text-ink">Horário de atendimento</strong>
        Segunda a sexta, 9h às 18h (horário de Brasília). Fora desse período a
        gente responde no próximo dia útil.
      </div>
    </aside>
  );
}
