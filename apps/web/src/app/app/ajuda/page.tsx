import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getEffectiveUser } from "@/lib/get-effective-user";
import { buildDisplayUser } from "@/lib/user-display";
import { HelpPage } from "@/features/app/help/help-page";

export const metadata: Metadata = {
  title: "Ajuda e suporte",
};

export default async function AjudaRoute() {
  const effective = await getEffectiveUser();
  if (!effective) redirect("/sign-in?next=/app/ajuda");

  const display = buildDisplayUser({
    name: effective.name,
    email: effective.email,
  });

  return <HelpPage userName={display.name} userEmail={display.email} />;
}
