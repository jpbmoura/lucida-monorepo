import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api-client";
import { fetchSlideDeck } from "@/features/app/apresentacoes/data";
import { DeckDetail } from "@/features/app/apresentacoes/deck-detail";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  try {
    const deck = await fetchSlideDeck(id);
    return { title: deck.title };
  } catch {
    return { title: "Apresentação" };
  }
}

export default async function ApresentacaoDetailPage({ params }: PageProps) {
  const { id } = await params;
  let deck;
  try {
    deck = await fetchSlideDeck(id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }
  return <DeckDetail deck={deck} />;
}
