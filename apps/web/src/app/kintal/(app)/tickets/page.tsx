import type { Metadata } from "next";
import { fetchTickets, type TicketStatus } from "@/features/kintal/tickets/data";
import { TicketsList } from "@/features/kintal/tickets/components/tickets-list";

export const metadata: Metadata = {
  title: "Tickets",
};

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function KintalTicketsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const filter: TicketStatus | "all" =
    sp.status === "open" || sp.status === "closed" ? sp.status : "all";
  const data = await fetchTickets({
    kind: "support",
    status: filter === "all" ? undefined : filter,
  });

  return (
    <div className="mx-auto w-full px-5 py-10 pb-20 md:px-10">
      <header className="mb-8">
        <div className="mb-2 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.15em] text-gray-400">
          <span className="pulse-dot" />
          Atendimento
        </div>
        <h1 className="text-3xl font-medium leading-tight tracking-tighter text-ink md:text-4xl">
          Tickets
        </h1>
        <p className="mt-2 max-w-xl text-[15px] text-gray-500">
          Solicitações de suporte enviadas pra{" "}
          <strong>suporte@lucidaexam.com</strong> ou pelo formulário{" "}
          <strong>/app/ajuda</strong>.
        </p>
      </header>

      <TicketsList data={data} kind="support" activeFilter={filter} />
    </div>
  );
}
