// Logos das integrações — assets oficiais em public/brand/integrations/,
// renderizados via next/image (mesma convenção do componente Logo da marca).

import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
}

export function GoogleClassroomLogo({ className }: LogoProps) {
  return (
    <Image
      src="/brand/integrations/classroom.png"
      alt="Google Classroom"
      width={40}
      height={40}
      className={cn("object-contain", className)}
    />
  );
}

export function MicrosoftTeamsLogo({ className }: LogoProps) {
  return (
    <Image
      src="/brand/integrations/teams.svg"
      alt="Microsoft Teams"
      width={40}
      height={40}
      className={cn("object-contain", className)}
    />
  );
}

export function AlpaClassLogo({ className }: LogoProps) {
  return (
    <Image
      src="/brand/integrations/alpaclass.png"
      alt="AlpaClass"
      width={40}
      height={40}
      className={cn("object-contain", className)}
    />
  );
}
