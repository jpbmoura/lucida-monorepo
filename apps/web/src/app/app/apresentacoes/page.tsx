import { fetchSlideDecks } from "@/features/app/apresentacoes/data";
import { DeckList } from "@/features/app/apresentacoes/deck-list";

export const dynamic = "force-dynamic";

export const metadata = { title: "Apresentações" };

export default async function ApresentacoesPage() {
  const decks = await fetchSlideDecks().catch(() => []);
  return <DeckList decks={decks} />;
}
