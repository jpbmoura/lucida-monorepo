import type { Metadata } from "next";
import { fetchTickets } from "@/features/kintal/tickets/data";
import { TicketsList } from "@/features/kintal/tickets/components/tickets-list";

export const metadata: Metadata = {
  title: "Caixa de entrada",
};

interface PageProps {
  searchParams: Promise<{ unread?: string; archived?: string }>;
}

export default async function KintalInboxPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const archived = sp.archived === "1" || sp.archived === "true";
  const unread = sp.unread === "1" || sp.unread === "true";

  // Filtros são exclusivos: archived ganha prioridade. Default = Caixa
  // (status=open, não arquivada). "Arquivadas" só mostra closed.
  const filter: "all" | "unread" | "archived" = archived
    ? "archived"
    : unread
      ? "unread"
      : "all";

  const data = await fetchTickets({
    kind: "general",
    status: archived ? "closed" : "open",
    unreadOnly: unread && !archived,
  });

  return (
    <div className="mx-auto w-full px-5 py-10 pb-20 md:px-10">
      <header className="mb-8">
        <div className="mb-2 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.15em] text-gray-400">
          <span className="pulse-dot" />
          Atendimento
        </div>
        <h1 className="text-3xl font-medium leading-tight tracking-tighter text-ink md:text-4xl">
          Caixa de{" "}
          <span className="font-serif font-normal italic text-brand-primary">
            entrada
          </span>
        </h1>
        <p className="mt-2 max-w-xl text-[15px] text-gray-500">
          Tudo que chega em <strong>contato@lucidaexam.com</strong> e em
          outros endereços do domínio. Responda direto daqui — a resposta
          sai pelo Resend e cai de volta aqui se o cliente continuar a
          conversa.
        </p>
      </header>

      <TicketsList data={data} kind="general" activeFilter={filter} />
    </div>
  );
}
