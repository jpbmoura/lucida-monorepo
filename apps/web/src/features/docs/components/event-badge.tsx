import { cn } from "@/lib/utils";

export function EventBadge({
  event,
  className,
}: {
  event: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md bg-analytics-primary/10 px-1.5 py-0.5 font-mono text-[11px] text-analytics-primary",
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-analytics-primary" />
      {event}
    </span>
  );
}
