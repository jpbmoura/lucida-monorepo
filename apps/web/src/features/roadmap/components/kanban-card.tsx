import { ProductBadge } from "./product-badge";
import { VoteButton } from "./vote-button";
import { StaffActionsMenu } from "./staff-actions-menu";
import type { RoadmapItemDto } from "../types";

interface KanbanCardProps {
  item: RoadmapItemDto;
  canVote: boolean;
  isStaff: boolean;
}

// Card de uma lane do kanban (Em análise / Planejado / Em desenvolvimento /
// Lançado). Voto fica inline embaixo pra não competir com a hierarquia
// vertical das colunas.
export function KanbanCard({ item, canVote, isStaff }: KanbanCardProps) {
  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 transition-colors hover:border-gray-200">
      <div className="flex items-start justify-between gap-2">
        <ProductBadge product={item.product} />
        {isStaff && (
          <StaffActionsMenu item={item} />
        )}
      </div>
      <h3 className="text-[15px] font-medium leading-snug text-ink">
        {item.title}
      </h3>
      {item.description && (
        <p className="text-sm leading-relaxed text-gray-600">
          {item.description}
        </p>
      )}
      {item.staffNote && (
        <div className="rounded-xl bg-gray-50 px-3 py-2 text-xs leading-relaxed text-gray-600">
          <span className="font-medium text-gray-700">Nota do time: </span>
          {item.staffNote}
        </div>
      )}
      <div className="flex items-center justify-between border-t border-gray-100 pt-3">
        {item.source === "community" ? (
          <span className="text-[11px] uppercase tracking-[0.1em] text-gray-400">
            Da comunidade
          </span>
        ) : (
          <span className="text-[11px] uppercase tracking-[0.1em] text-gray-400">
            Pelo time Lucida
          </span>
        )}
        <VoteButton
          itemId={item.id}
          votes={item.votes}
          hasVoted={item.viewerHasVoted}
          canVote={canVote}
          variant="inline"
        />
      </div>
    </article>
  );
}
