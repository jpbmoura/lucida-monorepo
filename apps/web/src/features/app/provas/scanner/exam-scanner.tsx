"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState, useTransition } from "react";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Download,
  ShieldAlert,
  Trash2,
  Upload,
  XCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  approveScanAction,
  deleteScanAction,
  scanSheetAction,
} from "../actions";
import type { ExamDetailDTO, ScanItemDTO } from "../data";

interface ExamScannerProps {
  exam: ExamDetailDTO;
  turmaName: string;
  initialScans: ScanItemDTO[];
}

export function ExamScanner({
  exam,
  turmaName,
  initialScans,
}: ExamScannerProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [scans, setScans] = useState<ScanItemDTO[]>(initialScans);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    async (file: File) => {
      setError(null);
      setProcessing(true);
      try {
        const base64 = await fileToBase64(file);
        const result = await scanSheetAction(exam.id, { imageBase64: base64 });
        if (!result.ok) {
          setError(result.error?.message ?? "Falha ao processar folha.");
          return;
        }
        // Optimistic: só refresca pra puxar a lista atualizada (inclui o novo).
        startTransition(() => router.refresh());
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setProcessing(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [exam.id, router],
  );

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  }

  async function handleApprove(scanId: string) {
    const result = await approveScanAction(scanId, exam.id);
    if (!result.ok) {
      setError(result.error?.message ?? "Falha ao aprovar.");
      return;
    }
    setScans((prev) =>
      prev.map((s) =>
        s.id === scanId ? { ...s, reviewStatus: "approved" } : s,
      ),
    );
    startTransition(() => router.refresh());
  }

  async function handleDelete(scanId: string) {
    if (!confirm("Excluir essa digitalização?")) return;
    const result = await deleteScanAction(scanId, exam.id);
    if (!result.ok) {
      setError(result.error?.message ?? "Falha ao excluir.");
      return;
    }
    setScans((prev) => prev.filter((s) => s.id !== scanId));
  }

  const approvedCount = scans.filter(
    (s) => s.reviewStatus === "auto_approved" || s.reviewStatus === "approved",
  ).length;
  const pendingCount = scans.filter(
    (s) => s.reviewStatus === "pending",
  ).length;
  const avgScore =
    scans.length === 0
      ? 0
      : Math.round(
          (scans.reduce((sum, s) => sum + s.score, 0) / scans.length) * 10,
        ) / 10;

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-8 md:px-10">
      <nav className="mb-5 flex items-center gap-1.5 text-[13px] text-gray-500">
        <Link
          href={`/app/turmas/${exam.classId}`}
          className="transition-colors hover:text-ink"
        >
          <ArrowLeft className="mr-1 inline size-3.5" />
          {turmaName}
        </Link>
        <span className="text-gray-300">/</span>
        <Link
          href={`/app/provas/${exam.id}`}
          className="truncate transition-colors hover:text-ink"
        >
          {exam.title}
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-ink">Scanner</span>
      </nav>

      <header className="mb-8 flex flex-col gap-3 border-b border-gray-100 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.15em] text-gray-400">
            <span className="pulse-dot" />
            Correção por scanner
          </div>
          <h1 className="text-3xl font-medium leading-tight tracking-tighter text-ink md:text-4xl">
            Digitalizar folhas
          </h1>
          <p className="mt-1 text-[15px] text-gray-500">
            Fotografe ou envie a folha de respostas do aluno. A correção é
            automática.
          </p>
        </div>
        <Button variant="outline" size="md" asChild>
          <a href="/omr-answersheet.png" download="folha-de-respostas.png">
            <Download className="size-4" />
            Folha em branco
          </a>
        </Button>
      </header>

      <section
        className={cn(
          "mb-6 flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed p-10 text-center transition-colors",
          processing
            ? "border-brand-primary/40 bg-brand-primary/5"
            : "border-gray-200 bg-gray-50/40",
        )}
      >
        <span className="grid size-14 place-items-center rounded-full bg-white text-brand-primary shadow-soft">
          {processing ? (
            <Loader2 className="size-6 animate-spin" />
          ) : (
            <Camera className="size-6" />
          )}
        </span>
        <div>
          <h2 className="text-base font-medium text-ink">
            {processing ? "Processando folha..." : "Fotografe ou envie a folha"}
          </h2>
          <p className="mt-1 text-[13px] text-gray-500">
            Em celular o botão abre a câmera traseira direto. No computador
            seleciona um arquivo de imagem.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            disabled={processing}
            className="hidden"
            id="scan-capture"
          />
          <Button asChild variant="primary" size="md" disabled={processing}>
            <label htmlFor="scan-capture" className="cursor-pointer">
              <Camera className="size-4" strokeWidth={2.5} />
              Abrir câmera
            </label>
          </Button>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={processing}
            className="hidden"
            id="scan-upload"
          />
          <Button asChild variant="outline" size="md" disabled={processing}>
            <label htmlFor="scan-upload" className="cursor-pointer">
              <Upload className="size-4" />
              Enviar imagem
            </label>
          </Button>
        </div>
      </section>

      {error && (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {scans.length > 0 && (
        <div className="mb-6 grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-gray-100 bg-gray-100">
          <StatCell label="Total" value={scans.length.toString()} />
          <StatCell
            label="Aprovadas"
            value={approvedCount.toString()}
            tone="emerald"
          />
          <StatCell
            label="Para revisar"
            value={pendingCount.toString()}
            tone={pendingCount > 0 ? "amber" : "neutral"}
          />
        </div>
      )}

      {scans.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center text-sm text-gray-500">
          Nenhuma folha digitalizada ainda.
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {scans.map((scan) => (
            <ScanRow
              key={scan.id}
              scan={scan}
              onApprove={() => handleApprove(scan.id)}
              onDelete={() => handleDelete(scan.id)}
            />
          ))}
        </ul>
      )}

      <p className="mt-8 text-[12px] text-gray-400">
        Média da sessão: <span className="tabular-nums">{avgScore.toLocaleString("pt-BR", { minimumFractionDigits: 1 })}/10</span>
      </p>
    </div>
  );
}

function ScanRow({
  scan,
  onApprove,
  onDelete,
}: {
  scan: ScanItemDTO;
  onApprove: () => void;
  onDelete: () => void;
}) {
  const isApproved =
    scan.reviewStatus === "auto_approved" || scan.reviewStatus === "approved";
  const isRejected = scan.reviewStatus === "rejected";

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <StatusIcon status={scan.reviewStatus} />
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-ink">
              {scan.studentName ?? (
                <span className="italic text-gray-500">
                  {scan.studentCode
                    ? `Código ${scan.studentCode}`
                    : "Código não detectado"}
                </span>
              )}
            </div>
            <div className="mt-0.5 text-[11px] text-gray-500">
              {scan.studentName && scan.studentCode && (
                <>
                  <span className="tabular-nums">{scan.studentCode}</span>
                  <span className="mx-1.5 text-gray-300">·</span>
                </>
              )}
              <span className="tabular-nums">
                {scan.correctCount}/{scan.questionCount} acertos
              </span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <ScoreBadge score={scan.score} />
          <StatusBadge status={scan.reviewStatus} />
        </div>
      </div>

      {scan.reviewReasons.length > 0 && (
        <ul className="space-y-1 rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2.5 text-[12px] leading-relaxed text-amber-800">
          {scan.reviewReasons.map((r, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <ShieldAlert className="mt-0.5 size-3.5 shrink-0" />
              <span>{r}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-100 pt-3">
        {!isApproved && !isRejected && scan.studentName && (
          <Button variant="primary" size="sm" onClick={onApprove}>
            <CheckCircle2 className="size-3.5" strokeWidth={2.5} />
            Aprovar mesmo assim
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="text-red-600 hover:bg-red-50"
        >
          <Trash2 className="size-3.5" />
          Excluir
        </Button>
      </div>
    </li>
  );
}

function StatusIcon({ status }: { status: ScanItemDTO["reviewStatus"] }) {
  if (status === "auto_approved" || status === "approved") {
    return (
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
        <CheckCircle2 className="size-4" />
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-gray-100 text-gray-500">
        <XCircle className="size-4" />
      </span>
    );
  }
  return (
    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-700">
      <ShieldAlert className="size-4" />
    </span>
  );
}

function StatusBadge({ status }: { status: ScanItemDTO["reviewStatus"] }) {
  if (status === "auto_approved") {
    return (
      <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
        Auto-aprovada
      </span>
    );
  }
  if (status === "approved") {
    return (
      <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
        Aprovada
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
        Rejeitada
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
      Revisar
    </span>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const tone =
    score >= 8
      ? "bg-emerald-50 text-emerald-700"
      : score >= 6
        ? "bg-amber-50 text-amber-700"
        : "bg-red-50 text-red-700";
  return (
    <span
      className={cn(
        "inline-flex min-w-14 items-center justify-center rounded-md px-2 py-1 text-sm font-semibold tabular-nums",
        tone,
      )}
    >
      {score.toLocaleString("pt-BR", { minimumFractionDigits: 1 })}
    </span>
  );
}

function StatCell({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "emerald" | "amber";
}) {
  const toneClass =
    tone === "emerald"
      ? "text-emerald-700"
      : tone === "amber"
        ? "text-amber-700"
        : "text-ink";
  return (
    <div className="flex flex-col gap-1 bg-white p-4">
      <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-gray-500">
        {label}
      </span>
      <span
        className={cn(
          "text-2xl font-medium leading-none tabular-nums tracking-tighter",
          toneClass,
        )}
      >
        {value}
      </span>
    </div>
  );
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Falha ao ler arquivo."));
        return;
      }
      // Strip "data:image/...;base64," prefix — backend aceita os dois, mas
      // manda só o base64 cru reduz o payload um pouco.
      const comma = result.indexOf(",");
      resolve(comma > 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error("Erro ao ler arquivo."));
    reader.readAsDataURL(file);
  });
}
