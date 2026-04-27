import { cn } from "@/lib/utils";
import { PRODUCT_LABELS, type RoadmapProduct } from "../types";

interface ProductBadgeProps {
  product: RoadmapProduct;
  className?: string;
}

// Tag colorida usada em cada card. Usa as paletas brand-* (Exam = azul) e
// analytics-* (Analytics = roxo) — mantém aderência visual mesmo que o
// roadmap renderize fora dos route groups que setam .theme-analytics.
export function ProductBadge({ product, className }: ProductBadgeProps) {
  const styles =
    product === "exam"
      ? "border-brand-primary/20 bg-brand-primary/10 text-brand-dark-02"
      : "border-analytics-primary/20 bg-analytics-primary/10 text-analytics-dark-02";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.1em]",
        styles,
        className,
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          product === "exam" ? "bg-brand-primary" : "bg-analytics-primary",
        )}
      />
      {PRODUCT_LABELS[product]}
    </span>
  );
}
