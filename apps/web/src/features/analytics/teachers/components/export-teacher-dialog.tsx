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

interface ExportTeacherDialogProps {
  teacherId: string;
  teacherName: string;
}

/**
 * Modal de exportação. Baixa um único CSV com TODAS as submissões
 * finalizadas do professor (todas as turmas, todas as provas, todos os
 * alunos). O único recorte é o período sobre `submittedAt`.
 *
 * Estratégia do download: `fetch` + blob + `<a download>`. Não dá pra
 * server action porque streaming de bytes pro browser via action de Next
 * não é trivial. Next rewrite do `/v1/*` proxia pra api → same-origin →
 * cookie segue junto.
 */
export function ExportTeacherDialog({
  teacherId,
  teacherName,
}: ExportTeacherDialogProps) {
  const formId = useId();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const dateError = useMemo(() => {
    if (from && to && from > to) {
      return "A data final precisa ser igual ou posterior à inicial.";
    }
    return null;
  }, [from, to]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (dateError) return;
    setError(null);
    setPending(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);

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
      const filename =
        match?.[1] ?? `lucida-submissoes-${slug(teacherName)}.csv`;

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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Exportar submissões de {teacherName}</DialogTitle>
          <DialogDescription>
            Baixa um CSV com todas as submissões finalizadas do professor
            (todas as turmas e provas). Sem datas, exporta tudo.
          </DialogDescription>
        </DialogHeader>

        <form
          id={formId}
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
        >
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-ink">
              Período da submissão
            </legend>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor={`${formId}-from`}
                  className="text-xs text-gray-600"
                >
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
                <Label
                  htmlFor={`${formId}-to`}
                  className="text-xs text-gray-600"
                >
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

          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          )}
        </form>

        <DialogFooter className="mt-1 items-center sm:justify-end">
          <DialogClose asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
            >
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
