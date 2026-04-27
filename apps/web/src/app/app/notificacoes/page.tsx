import type { Metadata } from "next";
import { fetchInbox } from "@/features/notifications/data";
import { InboxList } from "@/features/notifications/components/inbox-list";

export const metadata: Metadata = {
  title: "Notificações",
};

export default async function NotificacoesPage() {
  const items = await fetchInbox({ limit: 200 });

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-10 md:px-10">
      <header className="mb-8">
        <div className="mb-2 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.15em] text-gray-400">
          <span className="pulse-dot" />
          Caixa de mensagens
        </div>
        <h1 className="text-3xl font-medium leading-tight tracking-tighter text-ink md:text-4xl">
          Suas{" "}
          <span className="font-serif font-normal italic text-brand-primary">
            notificações
          </span>
        </h1>
        <p className="mt-2 max-w-xl text-[15px] text-gray-500">
          Avisos da equipe Lucida e da sua instituição. Click pra abrir;
          dispense pra remover do histórico.
        </p>
      </header>

      <InboxList initialItems={items} />
    </div>
  );
}
