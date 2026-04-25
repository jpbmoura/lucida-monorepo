import Image from "next/image";
import { cn } from "@/lib/utils";

interface KintalLogoProps {
  variant?: "full" | "symbol" | "white";
  className?: string;
}

// Logotipo P&B usado exclusivamente no /kintal. "full" e "symbol" são
// pretos (pra fundos claros); "white" é o horizontal em branco (pra
// fundos escuros, ex. panel de ilustração no sign-in).
export function KintalLogo({ variant = "full", className }: KintalLogoProps) {
  const asset = {
    full: { src: "/brand/kintal/logo-lucida-bw.svg", w: 160, h: 41 },
    symbol: { src: "/brand/kintal/symbol-lucida-bw.svg", w: 40, h: 42 },
    white: { src: "/brand/kintal/logo-lucida-white.svg", w: 160, h: 41 },
  }[variant];

  return (
    <Image
      src={asset.src}
      alt="Lucida"
      width={asset.w}
      height={asset.h}
      priority
      className={cn("select-none", className)}
    />
  );
}
