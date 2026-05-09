"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  Plus,
  ScanLine,
  Search,
  Users,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deriveTurmaInitials } from "@/features/app/turmas/utils";
import type { TurmaDTO, TurmaExamDTO } from "@/features/app/turmas/types";

interface PickExamForScanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step =
  | { kind: "turma" }
  | { kind: "exam"; turma: TurmaDTO };

export function PickExamForScanDialog({
  open,
  onOpenChange,
}: PickExamForScanDialogProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>({ kind: "turma" });
  const [turmas, setTurmas] = useState<TurmaDTO[] | null>(null);
  const [turmasLoading, setTurmasLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Lista de provas por turma — cache simples key = turmaId.
  const [examsByTurma, setExamsByTurma] = useState<
    Record<string, TurmaExamDTO[] | undefined>
  >({});
  const [examsLoading, setExamsLoading] = useState(false);

  // Carrega turmas no 1º open.
  useEffect(() => {
    if (!open || turmas !== null) return;
    const abort = new AbortController();
    setTurmasLoading(true);
    setError(null);
    fetch("/v1/classes", { signal: abort.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error(`Falha ao buscar turmas (${r.status})`);
        return (await r.json()) as { data: TurmaDTO[] };
      })
      .then((j) => setTurmas(j.data))
      .catch((err) => {
        if ((err as Error).name !== "AbortError") {
          setError((err as Error).message ?? "Erro ao carregar turmas.");
        }
      })
      .finally(() => setTurmasLoading(false));
    return () => abort.abort();
  }, [open, turmas]);

  // Reset ao fechar.
  useEffect(() => {
    if (!open) {
      setStep({ kind: "turma" });
      setSearch("");
      setError(null);
    }
  }, [open]);

  // Reset da busca ao trocar de etapa.
  useEffect(() => {
    setSearch("");
  }, [step.kind]);

  async function pickTurma(turma: TurmaDTO) {
    setStep({ kind: "exam", turma });
    if (examsByTurma[turma.id]) return;
    setExamsLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/v1/classes/${encodeURIComponent(turma.id)}/exams`,
      );
      if (!res.ok) throw new Error(`Falha ao buscar provas (${res.status})`);
      const { data } = (await res.json()) as { data: TurmaExamDTO[] };
      setExamsByTurma((prev) => ({ ...prev, [turma.id]: data }));
    } catch (err) {
      setError((err as Error).message ?? "Erro ao carregar provas.");
    } finally {
      setExamsLoading(false);
    }
  }

  function pickExam(examId: string) {
    onOpenChange(false);
    router.push(`/app/provas/${examId}/scanner`);
  }

  const filteredTurmas = (turmas ?? []).filter((t) =>
    search.trim() === ""
      ? true
      : t.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  const currentExams =
    step.kind === "exam" ? (examsByTurma[step.turma.id] ?? []) : [];
  const filteredExams = currentExams.filter((e) =>
    search.trim() === ""
      ? true
      : e.title.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step.kind === "exam" && (
              <button
                type="button"
                onClick={() => setStep({ kind: "turma" })}
                className="grid size-7 shrink-0 place-items-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-ink"
                aria-label="Voltar"
              >
                <ArrowLeft className="size-4" />
              </button>
            )}
            {step.kind === "turma"
              ? "Qual turma você vai digitalizar?"
              : `Provas de ${step.turma.name}`}
          </DialogTitle>
          <DialogDescription>
            {step.kind === "turma"
              ? "Escolha a turma. Na próxima etapa você seleciona qual prova aplicar."
              : "Escolha a prova que os alunos responderam no papel."}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {step.kind === "turma" && (
          <TurmaStep
            loading={turmasLoading && turmas === null}
            turmas={turmas}
            filtered={filteredTurmas}
            search={search}
            onSearch={setSearch}
            onPick={pickTurma}
            onClose={() => onOpenChange(false)}
          />
        )}

        {step.kind === "exam" && (
          <ExamStep
            loading={examsLoading}
            exams={filteredExams}
            totalExams={currentExams.length}
            search={search}
            onSearch={setSearch}
            onPick={pickExam}
            turma={step.turma}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function TurmaStep({
  loading,
  turmas,
  filtered,
  search,
  onSearch,
  onPick,
  onClose,
}: {
  loading: boolean;
  turmas: TurmaDTO[] | null;
  filtered: TurmaDTO[];
  search: string;
  onSearch: (v: string) => void;
  onPick: (t: TurmaDTO) => void;
  onClose: () => void;
}) {
  if (loading) {
    return (
      <div className="py-8 text-center text-sm text-gray-500">
        Carregando turmas...
      </div>
    );
  }

  if (turmas && turmas.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-brand-primary/10 text-brand-primary">
          <Users className="size-5" />
        </span>
        <div className="flex flex-col gap-1">
          <h3 className="text-base font-medium text-ink">
            Você ainda não tem turmas
          </h3>
          <p className="max-w-xs text-xs text-gray-500">
            Crie uma turma e adicione alunos antes de digitalizar folhas.
          </p>
        </div>
        <Button asChild variant="primary" size="md" onClick={onClose}>
          <Link href="/app/cursos">
            <Plus className="size-4" strokeWidth={2.5} />
            Ir pra cursos
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
        <Input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Buscar turma..."
          className="pl-10"
          autoFocus
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-gray-50/40 px-4 py-6 text-center text-sm text-gray-500">
          Nenhuma turma combina com “{search}”.
        </div>
      ) : (
        <ul className="flex max-h-[320px] flex-col gap-1 overflow-y-auto pr-1">
          {filtered.map((turma) => (
            <li key={turma.id}>
              <button
                type="button"
                onClick={() => onPick(turma)}
                className="flex w-full items-center gap-3 rounded-xl border border-gray-100 bg-white px-3 py-2.5 text-left transition-colors hover:border-brand-primary/30 hover:bg-brand-primary/5"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-primary text-[13px] font-semibold text-white">
                  {deriveTurmaInitials(turma.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-ink">
                    {turma.name}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-gray-500">
                    <span className="inline-flex items-center gap-1">
                      <Users className="size-3" /> {turma.studentsCount}{" "}
                      {turma.studentsCount === 1 ? "aluno" : "alunos"}
                    </span>
                    <span className="size-0.5 rounded-full bg-gray-300" />
                    <span className="inline-flex items-center gap-1">
                      <FileText className="size-3" /> {turma.examsCount}{" "}
                      {turma.examsCount === 1 ? "prova" : "provas"}
                    </span>
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ExamStep({
  loading,
  exams,
  totalExams,
  search,
  onSearch,
  onPick,
  turma,
}: {
  loading: boolean;
  exams: TurmaExamDTO[];
  totalExams: number;
  search: string;
  onSearch: (v: string) => void;
  onPick: (examId: string) => void;
  turma: TurmaDTO;
}) {
  if (loading) {
    return (
      <div className="py-8 text-center text-sm text-gray-500">
        Carregando provas...
      </div>
    );
  }

  if (totalExams === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-brand-primary/10 text-brand-primary">
          <FileText className="size-5" />
        </span>
        <div className="flex flex-col gap-1">
          <h3 className="text-base font-medium text-ink">
            Esta turma não tem provas ainda
          </h3>
          <p className="max-w-xs text-xs text-gray-500">
            Crie uma prova primeiro — depois volte aqui pra digitalizar as
            folhas respondidas.
          </p>
        </div>
        <Button asChild variant="primary" size="md">
          <Link href={`/app/turmas/${turma.id}/provas/nova`}>
            <Plus className="size-4" strokeWidth={2.5} />
            Criar prova
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
        <Input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Buscar prova..."
          className="pl-10"
          autoFocus
        />
      </div>

      {exams.length === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-gray-50/40 px-4 py-6 text-center text-sm text-gray-500">
          Nenhuma prova combina com “{search}”.
        </div>
      ) : (
        <ul className="flex max-h-[320px] flex-col gap-1 overflow-y-auto pr-1">
          {exams.map((exam) => (
            <li key={exam.id}>
              <button
                type="button"
                onClick={() => onPick(exam.id)}
                className="flex w-full items-center gap-3 rounded-xl border border-gray-100 bg-white px-3 py-2.5 text-left transition-colors hover:border-brand-primary/30 hover:bg-brand-primary/5"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-primary/10 text-brand-primary">
                  <ScanLine className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-ink">
                    {exam.title}
                  </div>
                  <div className="mt-0.5 text-[11px] text-gray-500">
                    {exam.questionCount}{" "}
                    {exam.questionCount === 1 ? "questão" : "questões"}
                    {exam.submissionsCount > 0 && (
                      <>
                        <span className="mx-1.5 text-gray-300">·</span>
                        <span className="tabular-nums">
                          {exam.submissionsCount}{" "}
                          {exam.submissionsCount === 1
                            ? "submissão"
                            : "submissões"}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
