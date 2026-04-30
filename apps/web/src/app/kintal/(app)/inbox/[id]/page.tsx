import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchTicket } from "@/features/kintal/tickets/data";
import { TicketDetail } from "@/features/kintal/tickets/components/ticket-detail";
import { ApiError } from "@/lib/api-client";

export const metadata: Metadata = {
  title: "Mensagem",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function KintalInboxDetailPage({ params }: PageProps) {
  const { id } = await params;
  let ticket;
  try {
    ticket = await fetchTicket(id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      notFound();
    }
    throw err;
  }
  // O componente decide a UI por `ticket.kind`. Acessar uma mensagem da
  // inbox que na verdade é support ainda funciona (renderiza como support);
  // a separação é só de URL pra organizar mentalmente.
  return <TicketDetail ticket={ticket} />;
}
