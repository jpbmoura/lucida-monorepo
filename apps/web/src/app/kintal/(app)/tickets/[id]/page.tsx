import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchTicket } from "@/features/kintal/tickets/data";
import { TicketDetail } from "@/features/kintal/tickets/components/ticket-detail";
import { ApiError } from "@/lib/api-client";

export const metadata: Metadata = {
  title: "Ticket",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function KintalTicketDetailPage({ params }: PageProps) {
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
  return <TicketDetail ticket={ticket} />;
}
