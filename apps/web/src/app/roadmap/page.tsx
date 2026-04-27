import type { Metadata } from "next";
import { fetchRoadmap } from "@/features/roadmap/data";
import { RoadmapPage } from "@/features/roadmap/components/roadmap-page";
import { RoadmapTopbar } from "@/features/roadmap/components/roadmap-topbar";
import { getServerSession } from "@/lib/get-server-session";

export const metadata: Metadata = {
  title: "Roadmap",
  description:
    "O que estamos construindo na Lucida e o que vem depois. Sugira features e vote no que faz sentido pra você.",
};

// Server component — busca sessão (opcional) e roadmap em paralelo. A API
// retorna a lista já com `viewerHasVoted` e (pra staff) `createdBy`.
export default async function RoadmapRoute() {
  const [session, items] = await Promise.all([
    getServerSession(),
    fetchRoadmap(),
  ]);

  const isAuthenticated = session !== null;
  const isStaff = session?.user.role === "staff";
  const userName = session?.user.name ?? null;

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <RoadmapTopbar isAuthenticated={isAuthenticated} userName={userName} />
      <RoadmapPage
        items={items}
        isAuthenticated={isAuthenticated}
        isStaff={isStaff}
      />
    </div>
  );
}
