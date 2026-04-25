import { cn } from "@/lib/utils";

export interface StatusCode {
  code: number;
  name: string;
  description: React.ReactNode;
}

const TONE_BY_RANGE: Record<string, string> = {
  "2": "text-emerald-700 bg-emerald-50 border-emerald-100",
  "3": "text-amber-700 bg-amber-50 border-amber-100",
  "4": "text-red-700 bg-red-50 border-red-100",
  "5": "text-red-700 bg-red-50 border-red-100",
};

export function StatusCodeTable({
  items,
  className,
}: {
  items: StatusCode[];
  className?: string;
}) {
  return (
    <ul
      className={cn(
        "flex flex-col divide-y divide-gray-100 rounded-xl border border-gray-100 bg-white",
        className,
      )}
    >
      {items.map((s) => {
        const range = String(s.code).charAt(0);
        const tone = TONE_BY_RANGE[range] ?? "text-gray-700 bg-gray-50 border-gray-100";
        return (
          <li key={s.code} className="flex items-start gap-4 px-4 py-3">
            <span
              className={cn(
                "shrink-0 rounded-md border px-2 py-0.5 font-mono text-[12px] font-semibold",
                tone,
              )}
            >
              {s.code}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-medium text-ink">{s.name}</div>
              <div className="text-[13px] leading-relaxed text-gray-600 [&_code]:rounded [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[12px]">
                {s.description}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
