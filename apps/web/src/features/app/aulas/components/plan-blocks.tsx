"use client";

import { useState } from "react";
import { Loader2, Plus, RefreshCw, ShieldQuestion, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  BLOCK_META,
  SEGMENT_META,
  type LessonPlanBlockKey,
  type LessonPlanContent,
  type LessonPlanSegment,
} from "../types";

interface PlanBlocksProps {
  segment: LessonPlanSegment;
  content: LessonPlanContent;
  onChange: (key: LessonPlanBlockKey, value: string | string[]) => void;
  /** Regenera um bloco; resolve quando o novo valor já foi aplicado. */
  onRegenerate: (key: LessonPlanBlockKey) => Promise<void>;
}

// Ordem dos blocos no canvas. bnccSkills entra logo após objetivos (só K-12).
const ORDER: LessonPlanBlockKey[] = [
  "objectives",
  "content",
  "methodology",
  "resources",
  "introduction",
  "development",
  "conclusion",
  "assessment",
  "bibliography",
];

export function PlanBlocks({
  segment,
  content,
  onChange,
  onRegenerate,
}: PlanBlocksProps) {
  const showBibliography = segment === "FACULDADE" || segment === "MEDIO";

  return (
    <div className="flex flex-col gap-4">
      {ORDER.map((key) => {
        if (key === "bibliography" && !showBibliography) return null;
        return (
          <BlockCard
            key={key}
            blockKey={key}
            content={content}
            onChange={onChange}
            onRegenerate={onRegenerate}
          >
            {/* BNCC aparece logo após objetivos, só para K-12. */}
            {key === "objectives" && SEGMENT_META[segment].hasBncc && (
              <BnccCard content={content} />
            )}
          </BlockCard>
        );
      })}
    </div>
  );
}

function BlockCard({
  blockKey,
  content,
  onChange,
  onRegenerate,
  children,
}: {
  blockKey: LessonPlanBlockKey;
  content: LessonPlanContent;
  onChange: (key: LessonPlanBlockKey, value: string | string[]) => void;
  onRegenerate: (key: LessonPlanBlockKey) => Promise<void>;
  children?: React.ReactNode;
}) {
  const meta = BLOCK_META[blockKey];
  const [regenerating, setRegenerating] = useState(false);

  async function handleRegenerate() {
    setRegenerating(true);
    try {
      await onRegenerate(blockKey);
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <>
      <section className="rounded-2xl border border-gray-100 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink">{meta.label}</h3>
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={regenerating}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-ink disabled:opacity-50"
          >
            {regenerating ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5" />
            )}
            Regenerar
          </button>
        </div>

        {meta.kind === "text" ? (
          <Textarea
            value={content[blockKey] as string}
            onChange={(e) => onChange(blockKey, e.target.value)}
            rows={4}
            className="resize-y"
          />
        ) : (
          <ListEditor
            items={content[blockKey] as string[]}
            onChange={(items) => onChange(blockKey, items)}
          />
        )}
      </section>
      {children}
    </>
  );
}

function ListEditor({
  items,
  onChange,
}: {
  items: string[];
  onChange: (items: string[]) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2">
          <Input
            value={item}
            onChange={(e) =>
              onChange(items.map((it, j) => (j === i ? e.target.value : it)))
            }
            className="flex-1"
          />
          <button
            type="button"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            aria-label="Remover item"
            className="mt-1 grid size-8 shrink-0 place-items-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-ink"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, ""])}
        className="inline-flex items-center gap-1.5 self-start rounded-lg px-2.5 py-1.5 text-xs font-medium text-brand-primary transition-colors hover:bg-brand-primary/5"
      >
        <Plus className="size-3.5" />
        Adicionar item
      </button>
    </div>
  );
}

function BnccCard({ content }: { content: LessonPlanContent }) {
  if (content.bnccSkills.length === 0) return null;
  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5">
      <div className="mb-3 flex items-center gap-2">
        <h3 className="text-sm font-semibold text-ink">Habilidades BNCC</h3>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium",
            "bg-amber-100 text-amber-800",
          )}
        >
          <ShieldQuestion className="size-3" />
          Sugerido pela IA — confira
        </span>
      </div>
      <ul className="flex flex-col gap-2">
        {content.bnccSkills.map((skill, i) => (
          <li key={i} className="text-sm text-ink">
            <span className="font-semibold">{skill.code}</span>{" "}
            <span className="text-gray-600">{skill.description}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
