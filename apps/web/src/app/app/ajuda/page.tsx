import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/get-server-session";
import { buildDisplayUser } from "@/lib/user-display";
import { HelpPage } from "@/features/app/help/help-page";

export const metadata: Metadata = {
  title: "Ajuda e suporte",
};

export default async function AjudaRoute() {
  const session = await getServerSession();
  if (!session) redirect("/sign-in?next=/app/ajuda");

  const display = buildDisplayUser({
    name: session.user.name,
    email: session.user.email,
  });

  return <HelpPage userName={display.name} userEmail={display.email} />;
}
