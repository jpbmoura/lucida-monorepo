import { renderPwaIcon } from "@/lib/pwa-icon";

export const dynamic = "force-static";

export function GET() {
  return renderPwaIcon(192);
}
