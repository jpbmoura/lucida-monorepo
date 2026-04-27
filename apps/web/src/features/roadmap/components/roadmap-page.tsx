import { Container } from "@/components/ui/container";
import { RoadmapPageHeader } from "./roadmap-page-header";
import { SuggestionsList } from "./suggestions-list";
import { RoadmapKanban } from "./roadmap-kanban";
import type { RoadmapItemDto } from "../types";

interface RoadmapPageProps {
  items: RoadmapItemDto[];
  isAuthenticated: boolean;
  isStaff: boolean;
}

// Composição final da tela: kanban no topo (lanes curadas) e lista de
// sugestões abaixo. Voto exige login — anônimos veem mas o botão manda
// pro sign-in. `isStaff` ativa criar/editar/excluir inline.
export function RoadmapPage({
  items,
  isAuthenticated,
  isStaff,
}: RoadmapPageProps) {
  const suggested = items.filter((i) => i.stage === "suggested");
  const curated = items.filter((i) => i.stage !== "suggested");

  return (
    <main>
      <Container size="wide" className="flex flex-col gap-12 pb-24 pt-10 md:pt-14">
        <RoadmapPageHeader isStaff={isStaff} />

        <RoadmapKanban
          items={curated}
          canVote={isAuthenticated}
          isStaff={isStaff}
        />

        <SuggestionsList
          items={suggested}
          canVote={isAuthenticated}
          isStaff={isStaff}
          isAuthenticated={isAuthenticated}
        />
      </Container>
    </main>
  );
}
