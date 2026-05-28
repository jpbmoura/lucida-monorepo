"use client";

import { useRef, useState, type DragEvent } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  FileType,
  FileUp,
  Loader2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MaterialFile } from "../wizard-store";

interface DropZoneProps {
  files: MaterialFile[];
  onAdd: (files: File[]) => void;
  onRemove: (id: string) => void;
  disabled?: boolean;
}

const ACCEPT = ".pdf,.docx,.txt,.md";
const ACCEPT_MIMES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
];

export function DropZone({ files, onAdd, onRemove, disabled }: DropZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function validate(list: FileList | File[]): File[] {
    const out: File[] = [];
    for (const f of Array.from(list)) {
      const okMime = ACCEPT_MIMES.includes(f.type);
      const okExt = /\.(pdf|docx|txt|md)$/i.test(f.name);
      if (okMime || okExt) out.push(f);
    }
    return out;
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    onAdd(validate(e.dataTransfer.files));
  }

  function handlePick() {
    if (disabled) return;
    inputRef.current?.click();
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        onClick={handlePick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") handlePick();
        }}
        role="button"
        tabIndex={0}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        aria-disabled={disabled}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors",
          dragOver
            ? "border-brand-primary bg-brand-primary/5"
            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        <span className="grid size-12 place-items-center rounded-xl bg-brand-primary/10 text-brand-primary">
          <FileUp className="size-5" />
        </span>
        <div>
          <p className="text-sm font-medium text-ink">
            Arraste arquivos aqui ou <span className="text-brand-primary">clique para escolher</span>
          </p>
          <p className="mt-1 text-xs text-gray-500">
            PDF, DOCX, TXT — texto extraído no seu navegador, até 10 arquivos
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          hidden
          accept={ACCEPT}
          multiple
          onChange={(e) => {
            if (e.target.files) onAdd(validate(e.target.files));
            e.target.value = "";
          }}
        />
      </div>

      {files.length > 0 && (
        <ul className="flex flex-col gap-2">
          {files.map((file) => (
            <li
              key={file.id}
              className={cn(
                "flex items-start gap-3 rounded-xl border bg-white px-3 py-2.5",
                file.status === "error"
                  ? "border-red-200 bg-red-50/30"
                  : "border-gray-100",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg",
                  file.status === "error"
                    ? "bg-red-100 text-red-600"
                    : "bg-gray-50 text-gray-500",
                )}
              >
                {/\.(pdf)$/i.test(file.name) ? (
                  <FileType className="size-4" />
                ) : (
                  <FileText className="size-4" />
                )}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-ink">
                    {file.name}
                  </span>
                  <StatusIcon status={file.status} />
                </div>
                <div className="mt-0.5 text-[11px] text-gray-500">
                  {formatSize(file.size)}
                  {file.status === "extracting" &&
                    (file.extractProgress && file.extractProgress.total > 0
                      ? ` · extraindo página ${file.extractProgress.done}/${file.extractProgress.total}`
                      : " · extraindo texto...")}
                  {file.status === "done" &&
                    file.text != null &&
                    ` · ${file.text.length.toLocaleString("pt-BR")} caracteres`}
                </div>
                {file.status === "error" && file.error && (
                  <div className="mt-1 text-[12px] text-red-600">
                    {file.error}
                  </div>
                )}
                {file.status === "done" && file.warning && (
                  <div className="mt-1 text-[12px] text-amber-600">
                    {file.warning}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => onRemove(file.id)}
                aria-label={`Remover ${file.name}`}
                className="grid size-8 shrink-0 place-items-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-ink"
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: MaterialFile["status"] }) {
  if (status === "extracting") {
    return (
      <Loader2
        className="size-3.5 shrink-0 animate-spin text-brand-primary"
        aria-label="Extraindo"
      />
    );
  }
  if (status === "done") {
    return (
      <CheckCircle2
        className="size-3.5 shrink-0 text-emerald-500"
        aria-label="Pronto"
      />
    );
  }
  return (
    <AlertCircle
      className="size-3.5 shrink-0 text-red-500"
      aria-label="Erro"
    />
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
