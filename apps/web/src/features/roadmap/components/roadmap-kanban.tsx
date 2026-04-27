import { KANBAN_STAGES, STAGE_LABELS } from "../types";
import type { RoadmapItemDto, RoadmapStage } from "../types";
import { KanbanCard } from "./kanban-card";
import { DeclinedAccordion } from "./declined-accordion";

interface RoadmapKanbanProps {
  items: RoadmapItemDto[];
  canVote: boolean;
  isStaff: boolean;
}

// Kanban curado — só mostra os 4 estágios "ativos". `suggested` vai pra
// SuggestionsList, `declined` fica num acordeão separado embaixo.
export function RoadmapKanban({ items, canVote, isStaff }: RoadmapKanbanProps) {
  const byStage = groupByStage(items);
  const declined = byStage.declined ?? [];

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-5 lg:grid-cols-4">
        {KANBAN_STAGES.map((stage) => {
          const stageItems = byStage[stage] ?? [];
          return (
            <section
              key={stage}
              className="flex flex-col gap-3 rounded-2xl bg-gray-50/60 p-4"
            >
              <header className="flex items-center justify-between px-1">
                <h2 className="text-[13px] font-medium uppercase tracking-[0.1em] text-gray-600">
                  {STAGE_LABELS[stage]}
                </h2>
                <span className="rounded-pill bg-white px-2 py-0.5 text-[11px] font-medium text-gray-500">
                  {stageItems.length}
                </span>
              </header>
              <div className="flex flex-col gap-3">
                {stageItems.length === 0 ? (
                  <EmptyLane />
                ) : (
                  stageItems.map((item) => (
                    <KanbanCard
                      key={item.id}
                      item={item}
                      canVote={canVote}
                      isStaff={isStaff}
                    />
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>

      {declined.length > 0 && (
        <DeclinedAccordion
          items={declined}
          canVote={canVote}
          isStaff={isStaff}
        />
      )}
    </div>
  );
}

function EmptyLane() {
  return (
    <div className="rounded-xl border border-dashed border-gray-200 bg-white/40 p-4 text-center text-xs text-gray-400">
      Nada por aqui ainda
    </div>
  );
}

function groupByStage(
  items: RoadmapItemDto[],
): Partial<Record<RoadmapStage, RoadmapItemDto[]>> {
  const map: Partial<Record<RoadmapStage, RoadmapItemDto[]>> = {};
  for (const item of items) {
    (map[item.stage] ??= []).push(item);
  }
  return map;
}
