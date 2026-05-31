"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SlideTheme } from "../types";
import { THEMES } from "../themes";

export function ThemeGallery({
  value,
  onChange,
  suggested,
  compact,
}: {
  value: SlideTheme;
  onChange: (theme: SlideTheme) => void;
  suggested?: SlideTheme | null;
  compact?: boolean;
}) {
  return (
    <div className={cn("grid gap-2", compact ? "grid-cols-5" : "grid-cols-2 sm:grid-cols-3")}>
      {THEMES.map((theme) => {
        const active = value === theme.id;
        return (
          <button
            key={theme.id}
            type="button"
            onClick={() => onChange(theme.id)}
            className={cn(
              "group relative flex flex-col gap-2 rounded-xl border p-2 text-left transition-all",
              active ? "border-brand-primary ring-2 ring-brand-primary/30" : "border-gray-200 hover:border-gray-300",
            )}
          >
            <div
              className="relative flex h-16 items-center justify-center overflow-hidden rounded-lg"
              style={{ backgroundColor: theme.swatch.bg }}
            >
              <span
                className="text-lg font-semibold"
                style={{ color: theme.swatch.ink }}
              >
                Aa
              </span>
              <span
                className="absolute bottom-1.5 right-1.5 size-3 rounded-full"
                style={{ backgroundColor: theme.swatch.accent }}
              />
              {active && (
                <span className="absolute left-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-brand-primary text-white">
                  <Check className="size-3" />
                </span>
              )}
            </div>
            {!compact && (
              <div>
                <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
                  {theme.label}
                  {suggested === theme.id && (
                    <span className="rounded-full bg-brand-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-brand-primary">
                      sugerido
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-500">{theme.description}</p>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
