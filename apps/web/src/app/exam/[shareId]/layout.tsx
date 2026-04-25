import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export default function PublicExamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50/40">
      <header className="border-b border-gray-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5 md:px-10">
          <Logo priority />
          <span className="text-[11px] font-medium uppercase tracking-[0.15em] text-gray-400">
            Prova online
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-5 md:px-10 mt-4">
        {children}
      </main>
    </div>
  );
}
