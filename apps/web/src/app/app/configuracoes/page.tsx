import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/get-server-session";
import { fetchUserProfile } from "@/features/app/settings/data";
import { SettingsPage } from "@/features/app/settings/settings-page";

export const metadata: Metadata = {
  title: "Configurações",
};

export default async function ConfiguracoesRoute() {
  const session = await getServerSession();
  if (!session) redirect("/sign-in?next=/app/configuracoes");

  const profile = await fetchUserProfile();

  return <SettingsPage profile={profile} />;
}
