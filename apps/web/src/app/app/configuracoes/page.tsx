import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/get-server-session";
import {
  computeCompleteness,
  fetchUserProfile,
} from "@/features/app/settings/data";
import { SettingsPage } from "@/features/app/settings/settings-page";

export const metadata: Metadata = {
  title: "Configurações",
};

export default async function ConfiguracoesRoute() {
  const session = await getServerSession();
  if (!session) redirect("/sign-in?next=/app/configuracoes");

  const profile = await fetchUserProfile();
  // Calculado no server pra evitar arrastar `data.ts` (com "server-only")
  // pro bundle client da SettingsPage.
  const completeness = computeCompleteness(profile);

  return <SettingsPage profile={profile} completeness={completeness} />;
}
