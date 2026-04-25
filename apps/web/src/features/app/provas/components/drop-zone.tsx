"use client";

import { useRef, useState, type DragEvent } from "react";
import { FileUp, FileText, FileType, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DropZoneProps {
  files: File[];
  onAdd: (files: File[]) => void;
  onRemove: (index: number) => void;
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
            PDF, DOCX, TXT — até 25 MB cada, até 10 arquivos
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
          {files.map((file, i) => (
            <li
              key={`${file.name}-${i}`}
              className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-3 py-2.5"
            >
              <span className="grid size-8 place-items-center rounded-lg bg-gray-50 text-gray-500">
                {/\.(pdf)$/i.test(file.name) ? (
                  <FileType className="size-4" />
                ) : (
                  <FileText className="size-4" />
                )}
              </span>
              <div className="flex-1 min-w-0">
                <div className="truncate text-sm font-medium text-ink">{file.name}</div>
                <div className="text-[11px] text-gray-500">{formatSize(file.size)}</div>
              </div>
              <button
                type="button"
                onClick={() => onRemove(i)}
                aria-label={`Remover ${file.name}`}
                className="grid size-8 place-items-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-ink"
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

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
