import Image from "next/image";
import { cn } from "@/lib/utils";

type LogoVariant =
  | "default"
  | "white"
  | "duotone"
  | "analytics"
  | "analytics-white"
  | "analytics-duotone";

interface LogoProps {
  variant?: LogoVariant;
  className?: string;
  priority?: boolean;
}

const SOURCES: Record<LogoVariant, string> = {
  default: "/brand/logo-lucida.svg",
  white: "/brand/logo-lucida-white.svg",
  duotone: "/brand/logo-lucida-duotone.svg",
  analytics: "/brand/analytics/logo-analytics.svg",
  "analytics-white": "/brand/analytics/logo-analytics-white.svg",
  "analytics-duotone": "/brand/analytics/logo-analytics-duotone.svg",
};

const ALT: Record<LogoVariant, string> = {
  default: "Lucida",
  white: "Lucida",
  duotone: "Lucida",
  analytics: "Lucida Analytics",
  "analytics-white": "Lucida Analytics",
  "analytics-duotone": "Lucida Analytics",
};

export function Logo({ variant = "default", className, priority = false }: LogoProps) {
  return (
    <Image
      src={SOURCES[variant]}
      alt={ALT[variant]}
      width={160}
      height={28}
      priority={priority}
      className={cn("h-7 w-auto select-none", className)}
    />
  );
}
