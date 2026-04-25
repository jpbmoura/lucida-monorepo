"use client";

import { useState } from "react";
import { FileDown, Printer } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ExamExportVersion } from "../print/print-exam";

interface ExportExamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  examId: string;
}

const VERSIONS: Array<{
  value: ExamExportVersion;
  label: string;
  hint: string;
}> = [
  {
    value: "student",
    label: "Versão do aluno",
    hint: "Só enunciado e opções — sem gabarito.",
  },
  {
    value: "answer_key",
    label: "Gabarito",
    hint: "Respostas corretas e explicações.",
  },
  {
    value: "both",
    label: "Enunciado + gabarito",
    hint: "Duas partes no mesmo arquivo (ideal para arquivar).",
  },
];

export function ExportExamDialog({
  open,
  onOpenChange,
  examId,
}: ExportExamDialogProps) {
  const [version, setVersion] = useState<ExamExportVersion>("student");
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handlePrint() {
    const url = `/print/exams/${encodeURIComponent(examId)}?version=${version}`;
    window.open(url, "_blank", "noopener,noreferrer");
    onOpenChange(false);
  }

  async function handleDocx() {
    setError(null);
    setDownloading(true);
    try {
      const url = `/v1/exams/${encodeURIComponent(examId)}/export.docx?version=${version}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(
          res.status === 401
            ? "Sessão expirada. Recarregue a página."
            : "Não foi possível gerar o arquivo.",
        );
      }
      const blob = await res.blob();
      const fileName =
        extractFilename(res.headers.get("content-disposition")) ?? "prova.docx";
      triggerDownload(blob, fileName);
      onOpenChange(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setError(null);
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Exportar prova</DialogTitle>
          <DialogDescription>
            Escolha a versão que quer gerar e o formato.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          {VERSIONS.map((v) => (
            <label
              key={v.value}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors",
                version === v.value
                  ? "border-brand-primary bg-brand-primary/5"
                  : "border-gray-200 bg-white hover:border-gray-300",
              )}
            >
              <input
                type="radio"
                name="export-version"
                checked={version === v.value}
                onChange={() => setVersion(v.value)}
                className="mt-0.5 accent-brand-primary"
              />
              <span className="flex-1">
                <span className="block text-sm font-medium text-ink">
                  {v.label}
                </span>
                <span className="mt-0.5 block text-[11px] text-gray-500">
                  {v.hint}
                </span>
              </span>
            </label>
          ))}
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={handlePrint}
            disabled={downloading}
          >
            <Printer className="size-4" />
            Imprimir / PDF
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleDocx}
            disabled={downloading}
          >
            <FileDown className="size-4" strokeWidth={2.5} />
            {downloading ? "Gerando..." : "Baixar Word"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function extractFilename(disposition: string | null): string | null {
  if (!disposition) return null;
  const match = /filename="?([^";]+)"?/i.exec(disposition);
  const raw = match?.[1];
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function triggerDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
