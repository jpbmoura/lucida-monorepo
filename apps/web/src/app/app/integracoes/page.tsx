import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/get-server-session";
import { IntegracoesPage } from "@/features/app/integracoes/integracoes-page";

export const metadata: Metadata = {
  title: "Integrações",
};

export default async function IntegracoesRoute() {
  const session = await getServerSession();
  if (!session) redirect("/sign-in?next=/app/integracoes");

  return (
    <div className="mx-auto w-full px-5 py-10 pb-20 md:px-10">
      <IntegracoesPage />
    </div>
  );
}
