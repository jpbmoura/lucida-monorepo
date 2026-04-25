import { Info, TriangleAlert, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

type CalloutTone = "info" | "warning" | "tip";

const TONE_STYLES: Record<
  CalloutTone,
  { container: string; icon: React.ComponentType<{ className?: string }> }
> = {
  info: {
    container:
      "border-analytics-primary/20 bg-analytics-primary/5 text-analytics-dark-02",
    icon: Info,
  },
  warning: {
    container: "border-amber-200 bg-amber-50 text-amber-900",
    icon: TriangleAlert,
  },
  tip: {
    container: "border-emerald-200 bg-emerald-50 text-emerald-900",
    icon: Lightbulb,
  },
};

interface CalloutProps {
  tone?: CalloutTone;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Callout({
  tone = "info",
  title,
  children,
  className,
}: CalloutProps) {
  const { container, icon: Icon } = TONE_STYLES[tone];
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border px-4 py-3",
        container,
        className,
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-1 text-[13px] leading-relaxed">
        {title && <div className="font-medium">{title}</div>}
        <div className="[&>p]:m-0 [&_code]:rounded [&_code]:bg-black/5 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[12px]">
          {children}
        </div>
      </div>
    </div>
  );
}
