import type { Metadata } from "next";
import { fetchTickets, type TicketStatus } from "@/features/kintal/emails/data";
import {
  EmailsList,
  type EmailsFilter,
} from "@/features/kintal/emails/components/emails-list";

export const metadata: Metadata = {
  title: "Emails",
};

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

const STATUSES: TicketStatus[] = ["new", "in_progress", "done"];

export default async function KintalEmailsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const filter: EmailsFilter = STATUSES.includes(sp.status as TicketStatus)
    ? (sp.status as TicketStatus)
    : "all";

  const data = await fetchTickets({
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
          Emails
        </h1>
        <p className="mt-2 max-w-xl text-[15px] text-gray-500">
          Tudo que chega em <strong>contato@lucidaexam.com</strong> ou pelo
          formulário <strong>/app/ajuda</strong>. Responda direto daqui — a
          resposta sai pelo Resend e cai de volta aqui se o cliente continuar
          a conversa.
        </p>
      </header>

      <EmailsList data={data} activeFilter={filter} />
    </div>
  );
}
