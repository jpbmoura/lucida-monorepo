import { ProductBadge } from "./product-badge";
import { VoteButton } from "./vote-button";
import { StaffActionsMenu } from "./staff-actions-menu";
import type { RoadmapItemDto } from "../types";

interface SuggestionRowProps {
  item: RoadmapItemDto;
  canVote: boolean;
  isStaff: boolean;
}

// Item da lista "Sugestões da comunidade". Layout em linha com voto à
// esquerda — leitura rápida na pilha, sem o ruído de cards individuais.
export function SuggestionRow({ item, canVote, isStaff }: SuggestionRowProps) {
  return (
    <li className="group flex gap-4 rounded-2xl border border-gray-100 bg-white p-4 transition-colors hover:border-gray-200 md:p-5">
      <VoteButton
        itemId={item.id}
        votes={item.votes}
        hasVoted={item.viewerHasVoted}
        canVote={canVote}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <ProductBadge product={item.product} />
          {item.source === "community" && (
            <span className="text-[11px] uppercase tracking-[0.1em] text-gray-400">
              Sugerido pela comunidade
            </span>
          )}
        </div>
        <h3 className="text-base font-medium leading-snug text-ink">
          {item.title}
        </h3>
        {item.description && (
          <p className="text-sm leading-relaxed text-gray-600">
            {item.description}
          </p>
        )}
        {isStaff && item.createdBy && (
          <p className="text-xs text-gray-400">
            Sugerido por <span className="font-mono">{item.createdBy}</span>
          </p>
        )}
      </div>
      {isStaff && (
        <div className="shrink-0">
          <StaffActionsMenu item={item} />
        </div>
      )}
    </li>
  );
}
