"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { unvoteItemAction, voteOnItemAction } from "../data";

interface VoteButtonProps {
  itemId: string;
  votes: number;
  hasVoted: boolean;
  /** Quando false, o botão fica visualmente desabilitado e clicar abre o
   * sign-in (resolve via window.location pra preservar o `next`). */
  canVote: boolean;
  /** Variante visual: "stack" (vertical, à esquerda do card) ou "inline"
   * (horizontal, em cards do kanban onde espaço é menor). */
  variant?: "stack" | "inline";
}

export function VoteButton({
  itemId,
  votes,
  hasVoted,
  canVote,
  variant = "stack",
}: VoteButtonProps) {
  const router = useRouter();
  // Optimistic state — evita esperar revalidatePath pra refletir o clique.
  const [optimisticVotes, setOptimisticVotes] = useState(votes);
  const [optimisticHasVoted, setOptimisticHasVoted] = useState(hasVoted);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!canVote) {
      // Manda pra sign-in preservando a rota atual.
      const next = encodeURIComponent("/roadmap");
      window.location.href = `/sign-in?next=${next}`;
      return;
    }
    // Toggle otimista.
    const willVote = !optimisticHasVoted;
    setOptimisticHasVoted(willVote);
    setOptimisticVotes((v) => v + (willVote ? 1 : -1));

    startTransition(async () => {
      const result = willVote
        ? await voteOnItemAction(itemId)
        : await unvoteItemAction(itemId);
      if (!result.ok) {
        // Reverte se a ação falhou.
        setOptimisticHasVoted(!willVote);
        setOptimisticVotes((v) => v + (willVote ? -1 : +1));
      }
      router.refresh();
    });
  }

  if (variant === "inline") {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        aria-pressed={optimisticHasVoted}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-1 text-xs font-medium transition-colors",
          optimisticHasVoted
            ? "border-brand-primary/30 bg-brand-primary/10 text-brand-dark-02"
            : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-ink",
          isPending && "opacity-60",
        )}
      >
        <ChevronUp className="size-3.5" />
        {optimisticVotes}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-pressed={optimisticHasVoted}
      className={cn(
        "flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border px-3 py-2.5 text-center transition-all",
        optimisticHasVoted
          ? "border-brand-primary/30 bg-brand-primary/10 text-brand-dark-02"
          : "border-gray-200 bg-white text-gray-600 hover:-translate-y-px hover:border-gray-300 hover:text-ink",
        isPending && "opacity-60",
      )}
    >
      <ChevronUp
        className={cn(
          "size-4",
          optimisticHasVoted ? "text-brand-primary" : "text-gray-400",
        )}
        strokeWidth={2.5}
      />
      <span className="text-sm font-semibold tabular-nums">
        {optimisticVotes}
      </span>
    </button>
  );
}
