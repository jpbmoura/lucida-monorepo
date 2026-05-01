import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchTicket } from "@/features/kintal/emails/data";
import { EmailDetail } from "@/features/kintal/emails/components/email-detail";
import { fetchKintalUser } from "@/features/kintal/users/data";
import type { KintalUserDetail } from "@/features/kintal/users/types";
import { ApiError } from "@/lib/api-client";

export const metadata: Metadata = {
  title: "Email",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function KintalEmailDetailPage({ params }: PageProps) {
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

  // Hidrata o painel lateral com os dados do cadastro Lucida quando o
  // remetente está vinculado a um user. Falhas (404, 500) caem pra view
  // de não-cliente — preferimos degradar do que travar a página.
  let customer: KintalUserDetail | null = null;
  if (ticket.userId) {
    try {
      customer = await fetchKintalUser(ticket.userId);
    } catch (err) {
      console.warn(
        "[kintal/emails] falha ao carregar perfil do remetente:",
        err,
      );
    }
  }

  return <EmailDetail ticket={ticket} customer={customer} />;
}
