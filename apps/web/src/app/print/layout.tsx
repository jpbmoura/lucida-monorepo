import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/get-server-session";

// Layout separado do (app) — sem sidebar nem topbar. Pensado pra ser impresso
// direto pelo navegador (Ctrl+P); o que aparece na tela é exatamente o que sai
// no PDF.
export default async function PrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  if (!session) {
    redirect("/sign-in");
  }

  return <div className="print-root bg-white text-ink">{children}</div>;
}
