import { Download, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/relative-time";
import type {
  InvoiceListItemDTO,
  InvoiceSource,
  InvoiceStatus,
} from "../data";

interface Props {
  items: InvoiceListItemDTO[];
  /**
   * Texto do título — "Notas fiscais" no /app/billing,
   * "Notas fiscais da instituição" no /analytics. Default = "Notas fiscais".
   */
  title?: string;
  description?: string;
}

/**
 * Lista de NFS-e emitidas. PDF/XML quando autorizadas linkam direto pra
 * URL pública do NFE.io — sem proxy, sem storage nosso. Status terminais
 * (issued/failed/cancelled) ficam estáveis; pending/processing podem
 * levar minutos pra resolver.
 */
export function InvoicesSection({
  items,
  title = "Notas fiscais",
  description = "Cada pagamento confirmado gera uma nota fiscal. PDF e XML ficam disponíveis assim que a prefeitura autoriza.",
}: Props) {
  return (
    <section className="mb-10">
      <header className="mb-5 flex flex-col gap-1">
        <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-400">
          NFS-e
        </div>
        <h2 className="text-2xl font-medium tracking-tight text-ink">{title}</h2>
        <p className="text-sm text-gray-500">{description}</p>
      </header>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-14 text-center text-sm text-gray-500">
          Nenhuma nota fiscal emitida ainda.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60 text-left text-[10px] font-medium uppercase tracking-[0.08em] text-gray-500">
                <th className="px-5 py-2.5">Descrição</th>
                <th className="hidden px-5 py-2.5 md:table-cell">Origem</th>
                <th className="px-5 py-2.5">Status</th>
                <th className="px-5 py-2.5 text-right">Valor</th>
                <th className="hidden px-5 py-2.5 text-right md:table-cell">
                  Data
                </th>
                <th className="px-5 py-2.5 text-right">Arquivos</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr
                  key={item.id}
                  className={cn(
                    "transition-colors hover:bg-gray-50",
                    i < items.length - 1 && "border-b border-gray-100",
                  )}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="grid size-7 shrink-0 place-items-center rounded-md bg-brand-primary/10 text-brand-primary">
                        <FileText className="size-3.5" />
                      </span>
                      <div className="min-w-0">
                        <div className="truncate font-medium text-ink">
                          {item.description}
                        </div>
                        {item.rpsLabel && (
                          <div className="mt-0.5 truncate text-[11px] text-gray-500">
                            {item.rpsLabel}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-5 py-3 text-[11px] text-gray-500 md:table-cell">
                    {sourceLabel(item.source)}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-5 py-3 text-right font-medium tabular-nums text-ink">
                    {formatBRL(item.amountCents)}
                  </td>
                  <td className="hidden px-5 py-3 text-right text-xs text-gray-500 md:table-cell">
                    {formatRelativeTime(item.issuedAt ?? item.createdAt)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <FileLinks
                      pdfUrl={item.pdfUrl}
                      xmlUrl={item.xmlUrl}
                      status={item.status}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const styles: Record<InvoiceStatus, string> = {
    pending: "bg-gray-100 text-gray-600",
    processing: "bg-amber-50 text-amber-700",
    issued: "bg-emerald-50 text-emerald-700",
    failed: "bg-red-50 text-red-700",
    cancelled: "bg-gray-100 text-gray-500",
  };
  const labels: Record<InvoiceStatus, string> = {
    pending: "Aguardando",
    processing: "Processando",
    issued: "Emitida",
    failed: "Falhou",
    cancelled: "Cancelada",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium",
        styles[status],
      )}
    >
      {(status === "pending" || status === "processing") && (
        <Loader2 className="size-3 animate-spin" />
      )}
      {labels[status]}
    </span>
  );
}

function FileLinks({
  pdfUrl,
  xmlUrl,
  status,
}: {
  pdfUrl: string | null;
  xmlUrl: string | null;
  status: InvoiceStatus;
}) {
  if (status !== "issued" || !pdfUrl) {
    return <span className="text-[11px] text-gray-400">—</span>;
  }
  return (
    <div className="inline-flex items-center gap-2">
      <a
        href={pdfUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium text-ink transition-colors hover:bg-gray-50"
      >
        <Download className="size-3" />
        PDF
      </a>
      {xmlUrl && (
        <a
          href={xmlUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] font-medium text-gray-500 transition-colors hover:text-ink"
        >
          XML
        </a>
      )}
    </div>
  );
}

function sourceLabel(source: InvoiceSource): string {
  switch (source) {
    case "subscription":
      return "Assinatura";
    case "topup_stripe":
      return "Pacote (cartão)";
    case "topup_pix":
      return "Pacote (PIX)";
  }
}

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
