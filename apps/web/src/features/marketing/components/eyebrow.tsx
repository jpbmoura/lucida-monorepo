import { cn } from "@/lib/utils";

interface EyebrowProps {
  children: React.ReactNode;
  tone?: "light" | "dark";
  className?: string;
  dot?: boolean;
}

export function Eyebrow({ children, tone = "light", className, dot = true }: EyebrowProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.15em]",
        tone === "dark" ? "text-brand-light" : "text-gray-400",
        className,
      )}
    >
      {dot && <span className="pulse-dot" aria-hidden />}
      {children}
    </div>
  );
}
