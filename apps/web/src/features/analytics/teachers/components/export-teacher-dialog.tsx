"use client";

import { useId, useMemo, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "submitted" | "in_progress";

interface ClassOption {
  classId: string;
  name: string;
  courseName: string;
}

interface ExamOption {
  examId: string;
  title: string;
  className: string;
}

interface ExportTeacherDialogProps {
  teacherId: string;
  teacherName: string;
  classes: ClassOption[];
  /**
   * Pode estar capado em 50 e/ou filtrado pelo período do header — vem do
   * mesmo overview. Pra "exportar todas as provas do professor", o usuário
   * deixa o filtro vazio e usa o range de data.
   */
  exams: ExamOption[];
}

/**
 * Modal de exportação. Filtros opcionais; submeter sem nenhum equivale ao
 * comportamento antigo (export integral). Monta querystring e dispara
 * fetch + download em blob — não dá pra server action porque retornar
 * `Uint8Array` pro browser via action de Next não é trivial.
 *
 * Next rewrite do `/v1/*` proxia pra api, então o request vai same-origin
 * e o cookie de sessão segue junto.
 */
export function ExportTeacherDialog({
  teacherId,
  teacherName,
  classes,
  exams,
}: ExportTeacherDialogProps) {
  const formId = useId();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [classIds, setClassIds] = useState<Set<string>>(new Set());
  const [examIds, setExamIds] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<StatusFilter>("all");

  const dateError = useMemo(() => {
    if (from && to && from > to) {
      return "A data final precisa ser igual ou posterior à inicial.";
    }
    return null;
  }, [from, to]);

  function toggleSet(
    setter: typeof setClassIds,
    current: Set<string>,
    id: string,
  ) {
    const next = new Set(current);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setter(next);
  }

  function resetForm() {
    setFrom("");
    setTo("");
    setClassIds(new Set());
    setExamIds(new Set());
    setStatus("all");
    setError(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (dateError) return;
    setError(null);
    setPending(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (classIds.size > 0) params.set("classIds", [...classIds].join(","));
      if (examIds.size > 0) params.set("examIds", [...examIds].join(","));
      if (status !== "all") params.set("status", status);

      const qs = params.toString();
      const url = `/v1/analytics/teachers/${encodeURIComponent(teacherId)}/export${qs ? `?${qs}` : ""}`;
      const res = await fetch(url, { cache: "no-store" });

      if (!res.ok) {
        let message = "Não foi possível exportar.";
        try {
          const body = await res.json();
          message = body?.message ?? message;
        } catch {
          // mantém mensagem default
        }
        setError(message);
        return;
      }

      const blob = await res.blob();
      const disposition = res.headers.get("content-disposition") ?? "";
      const match = /filename="?([^";]+)"?/i.exec(disposition);
      const filename = match?.[1] ?? `lucida-${slug(teacherName)}.zip`;

      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
      setOpen(false);
    } catch {
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setPending(false);
    }
  }

  const totalFilters =
    (from ? 1 : 0) +
    (to ? 1 : 0) +
    (classIds.size > 0 ? 1 : 0) +
    (examIds.size > 0 ? 1 : 0) +
    (status !== "all" ? 1 : 0);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="md">
          <Download className="size-4" />
          Exportar dados
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Exportar dados de {teacherName}</DialogTitle>
          <DialogDescription>
            Gera um ZIP com turmas, alunos, provas e submissões em CSV. Os
            filtros são opcionais — sem nenhum, exporta tudo do professor.
          </DialogDescription>
        </DialogHeader>

        <form
          id={formId}
          onSubmit={handleSubmit}
          className="flex flex-col gap-5"
        >
          {/* ── Período ── */}
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-ink">
              Período (data de submissão)
            </legend>
            <p className="text-xs text-gray-500">
              Filtra pela data em que o aluno entregou a prova. Provas em
              andamento ficam de fora quando um período é informado.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`${formId}-from`} className="text-xs text-gray-600">
                  De
                </Label>
                <Input
                  id={`${formId}-from`}
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  max={to || undefined}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`${formId}-to`} className="text-xs text-gray-600">
                  Até
                </Label>
                <Input
                  id={`${formId}-to`}
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  min={from || undefined}
                />
              </div>
            </div>
            {dateError && (
              <span className="text-xs text-red-600">{dateError}</span>
            )}
          </fieldset>

          {/* ── Status ── */}
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-ink">Status</legend>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { value: "all", label: "Todas" },
                  { value: "submitted", label: "Finalizadas" },
                  { value: "in_progress", label: "Em andamento" },
                ] as const
              ).map((opt) => (
                <label
                  key={opt.value}
                  className={cn(
                    "cursor-pointer rounded-pill border px-3 py-1.5 text-xs font-medium transition-colors",
                    status === opt.value
                      ? "border-analytics-primary bg-analytics-primary/10 text-analytics-primary"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300",
                  )}
                >
                  <input
                    type="radio"
                    name={`${formId}-status`}
                    value={opt.value}
                    checked={status === opt.value}
                    onChange={() => setStatus(opt.value)}
                    className="sr-only"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </fieldset>

          {/* ── Turmas ── */}
          <fieldset className="flex flex-col gap-2">
            <legend className="flex w-full items-center justify-between text-sm font-medium text-ink">
              <span>Turmas</span>
              {classIds.size > 0 && (
                <button
                  type="button"
                  onClick={() => setClassIds(new Set())}
                  className="text-xs font-normal text-gray-500 hover:text-ink"
                >
                  Limpar ({classIds.size})
                </button>
              )}
            </legend>
            {classes.length === 0 ? (
              <p className="rounded-xl border border-dashed border-gray-200 px-3 py-2 text-xs text-gray-500">
                Sem turmas cadastradas para este professor.
              </p>
            ) : (
              <div className="flex max-h-40 flex-col gap-1 overflow-y-auto rounded-xl border border-gray-200 p-2">
                {classes.map((c) => (
                  <OptionRow
                    key={c.classId}
                    checked={classIds.has(c.classId)}
                    onToggle={() => toggleSet(setClassIds, classIds, c.classId)}
                    label={c.name}
                    sub={c.courseName}
                  />
                ))}
              </div>
            )}
          </fieldset>

          {/* ── Provas ── */}
          <fieldset className="flex flex-col gap-2">
            <legend className="flex w-full items-center justify-between text-sm font-medium text-ink">
              <span>Provas</span>
              {examIds.size > 0 && (
                <button
                  type="button"
                  onClick={() => setExamIds(new Set())}
                  className="text-xs font-normal text-gray-500 hover:text-ink"
                >
                  Limpar ({examIds.size})
                </button>
              )}
            </legend>
            {exams.length === 0 ? (
              <p className="rounded-xl border border-dashed border-gray-200 px-3 py-2 text-xs text-gray-500">
                Sem provas no período carregado. Use o filtro de data para
                cobrir um intervalo maior.
              </p>
            ) : (
              <div className="flex max-h-40 flex-col gap-1 overflow-y-auto rounded-xl border border-gray-200 p-2">
                {exams.map((e) => (
                  <OptionRow
                    key={e.examId}
                    checked={examIds.has(e.examId)}
                    onToggle={() => toggleSet(setExamIds, examIds, e.examId)}
                    label={e.title}
                    sub={e.className}
                  />
                ))}
              </div>
            )}
          </fieldset>

          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          )}
        </form>

        <DialogFooter className="mt-1 items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={resetForm}
              disabled={pending || totalFilters === 0}
              className="text-xs font-medium text-gray-500 transition-colors hover:text-ink disabled:opacity-40"
            >
              Limpar tudo
            </button>
            {totalFilters > 0 && (
              <span className="text-[11px] text-gray-400">
                {totalFilters} filtro{totalFilters > 1 ? "s" : ""} aplicado
                {totalFilters > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <DialogClose asChild>
              <Button type="button" variant="ghost" size="sm" disabled={pending}>
                Cancelar
              </Button>
            </DialogClose>
            <Button
              type="submit"
              form={formId}
              size="sm"
              disabled={pending || dateError !== null}
              className="bg-analytics-primary text-white hover:bg-analytics-dark-01"
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              {pending ? "Preparando..." : "Baixar CSV"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OptionRow({
  checked,
  onToggle,
  label,
  sub,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
  sub: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-1.5 transition-colors",
        checked ? "bg-analytics-primary/5" : "hover:bg-gray-50",
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="mt-0.5 size-4 shrink-0 cursor-pointer accent-analytics-primary"
      />
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-[13px] text-ink">{label}</span>
        {sub && <span className="truncate text-[11px] text-gray-500">{sub}</span>}
      </span>
    </label>
  );
}

function slug(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}
