import Image from "next/image";
import { cn } from "@/lib/utils";

const AVATARS = [
  { src: "/people/avatar1.jpg", alt: "Professora Ana" },
  { src: "/people/avatar2.jpg", alt: "Professor Luís" },
  { src: "/people/avatar3.jpg", alt: "Professora Ester" },
];

interface TrustStripProps {
  className?: string;
  tone?: "light" | "dark";
}

export function TrustStrip({ className, tone = "light" }: TrustStripProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-3 rounded-pill border px-3 py-2 text-sm",
        tone === "dark"
          ? "border-white/10 bg-white/5 text-brand-off-white"
          : "border-gray-200 bg-white text-gray-600",
        className,
      )}
    >
      <div className="flex -space-x-2">
        {AVATARS.map((avatar) => (
          <span
            key={avatar.src}
            className={cn(
              "relative size-7 overflow-hidden rounded-full ring-2",
              tone === "dark" ? "ring-brand-super-dark" : "ring-white",
            )}
          >
            <Image src={avatar.src} alt={avatar.alt} fill sizes="28px" className="object-cover" />
          </span>
        ))}
      </div>
      <span>
        Usada por <strong className={tone === "dark" ? "text-white" : "text-ink"}>+3 mil professores</strong>
      </span>
    </div>
  );
}
