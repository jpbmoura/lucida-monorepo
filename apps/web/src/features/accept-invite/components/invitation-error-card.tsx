import Link from "next/link";
import { AlertCircle } from "lucide-react";

interface InvitationErrorCardProps {
  title: string;
  message: string;
}

export function InvitationErrorCard({ title, message }: InvitationErrorCardProps) {
  return (
    <div className="flex flex-col items-center gap-5 rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-soft">
      <span className="grid size-12 place-items-center rounded-xl bg-red-50 text-red-600">
        <AlertCircle className="size-5" />
      </span>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-medium tracking-tight text-ink">
          {title}
        </h1>
        <p className="text-sm leading-relaxed text-gray-500">{message}</p>
      </div>
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 rounded-pill bg-ink px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-ink/90"
      >
        Ir para a página inicial
      </Link>
    </div>
  );
}
