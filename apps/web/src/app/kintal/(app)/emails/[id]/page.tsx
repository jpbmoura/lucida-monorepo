import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchTicket } from "@/features/kintal/emails/data";
import { EmailDetail } from "@/features/kintal/emails/components/email-detail";
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
  return <EmailDetail ticket={ticket} />;
}
