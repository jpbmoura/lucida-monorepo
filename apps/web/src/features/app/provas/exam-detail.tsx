"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  PencilLine,
  Save,
  X,
  Clock,
  FileText,
  Sparkles,
  Plus,
  Link2,
  Check,
  FileDown,
  ScanLine,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ExamDetailDTO, ExamSubmissionsResult } from "./data";
import type { GeneratedQuestion } from "./types";
import { QuestionEditor } from "./components/question-editor";
import { StudentPreview } from "./components/student-preview";
import { ExamMetadataDialog } from "./components/exam-metadata-dialog";
import { DeleteExamDialog } from "./components/delete-exam-dialog";
import { ExportExamDialog } from "./components/export-exam-dialog";
import { SubmissionsSection } from "./components/submissions-section";
import { updateExamAction, deleteExamAction } from "./actions";

const STYLE_LABEL: Record<ExamDetailDTO["style"], string> = {
  simple: "Simples",
  contextual: "Contextual",
  analytical: "Analítica",
  reflective: "Reflexiva",
};

interface ExamDetailProps {
  exam: ExamDetailDTO;
  turmaName: string;
  submissions: ExamSubmissionsResult;
}

export function ExamDetail({ exam, turmaName, submissions }: ExamDetailProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [mode, setMode] = useState<"view" | "edit">("view");
  const [metaOpen, setMetaOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const [draft, setDraft] = useState<GeneratedQuestion[]>(() =>
    exam.questions.map(cloneQuestion),
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(exam.questions),
    [draft, exam.questions],
  );

  function enterEdit() {
    setDraft(exam.questions.map(cloneQuestion));
    setSaveError(null);
    setMode("edit");
  }

  function discardEdit() {
    if (dirty && !confirm("Descartar alterações não salvas?")) return;
    setDraft(exam.questions.map(cloneQuestion));
    setSaveError(null);
    setMode("view");
  }

  async function saveQuestions() {
    setSaveError(null);
    setSaving(true);
    try {
      const result = await updateExamAction(exam.id, exam.classId, {
        questions: draft.map((q) => ({
          type: q.type,
          statement: q.statement,
          context: q.context,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          difficulty: q.difficulty,
        })),
      });
      if (!result.ok) {
        setSaveError(result.error?.message ?? "Não foi possível salvar.");
        return;
      }
      startTransition(() => router.refresh());
      setMode("view");
    } finally {
      setSaving(false);
    }
  }

  async function saveMetadata(values: {
    title: string;
    description?: string;
    duration: number;
  }) {
    const result = await updateExamAction(exam.id, exam.classId, values);
    if (result.ok) startTransition(() => router.refresh());
    return { ok: result.ok, error: result.error?.message };
  }

  async function handleDelete() {
    const result = await deleteExamAction(exam.id, exam.classId);
    if (result.ok) {
      startTransition(() => {
        router.push(`/app/turmas/${exam.classId}`);
        router.refresh();
      });
    }
    return { ok: result.ok, error: result.error?.message };
  }

  return (
    <>
      <div className="mx-auto w-full max-w-[1600px] px-5 py-8 md:px-10">
        <Breadcrumb classId={exam.classId} turmaName={turmaName} examTitle={exam.title} />

        <Header
          exam={exam}
          mode={mode}
          dirty={dirty}
          saving={saving}
          onEditMetadata={() => setMetaOpen(true)}
          onEnterEdit={enterEdit}
          onDiscardEdit={discardEdit}
          onSave={saveQuestions}
          onDelete={() => setDeleteOpen(true)}
          onExport={() => setExportOpen(true)}
        />

        {saveError && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {saveError}
          </div>
        )}

        {mode === "view" ? (
          <>
            <ViewMode exam={exam} />
            <SubmissionsSection
              items={submissions.items}
              stats={submissions.stats}
            />
          </>
        ) : (
          <EditMode draft={draft} setDraft={setDraft} style={exam.style} />
        )}
      </div>

      <ExamMetadataDialog
        open={metaOpen}
        onOpenChange={setMetaOpen}
        initial={{
          title: exam.title,
          description: exam.description,
          duration: exam.duration,
        }}
        onSubmit={saveMetadata}
      />

      <DeleteExamDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        examTitle={exam.title}
        questionCount={exam.questions.length}
        onConfirm={handleDelete}
      />

      <ExportExamDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        examId={exam.id}
      />
    </>
  );
}

function Breadcrumb({
  classId,
  turmaName,
  examTitle,
}: {
  classId: string;
  turmaName: string;
  examTitle: string;
}) {
  return (
    <nav className="mb-5 flex items-center gap-1.5 text-[13px] text-gray-500">
      <Link href={`/app/turmas/${classId}`} className="transition-colors hover:text-ink">
        <ArrowLeft className="mr-1 inline size-3.5" />
        {turmaName}
      </Link>
      <span className="text-gray-300">/</span>
      <span className="truncate text-ink">{examTitle}</span>
    </nav>
  );
}

interface HeaderProps {
  exam: ExamDetailDTO;
  mode: "view" | "edit";
  dirty: boolean;
  saving: boolean;
  onEditMetadata: () => void;
  onEnterEdit: () => void;
  onDiscardEdit: () => void;
  onSave: () => void;
  onDelete: () => void;
  onExport: () => void;
}

function Header({
  exam,
  mode,
  dirty,
  saving,
  onEditMetadata,
  onEnterEdit,
  onDiscardEdit,
  onSave,
  onDelete,
  onExport,
}: HeaderProps) {
  return (
    <header className="mb-8 flex flex-col gap-6 border-b border-gray-100 pb-8 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0 flex-1">
        <h1 className="text-3xl font-medium leading-tight tracking-tighter text-ink md:text-4xl">
          {exam.title}
        </h1>
        {exam.description && (
          <p className="mt-2 max-w-3xl text-[15px] text-gray-500">{exam.description}</p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <Stat
            icon={<FileText className="size-3.5" />}
            label={`${exam.questions.length} ${exam.questions.length === 1 ? "questão" : "questões"}`}
          />
          <Dot />
          <span className="inline-flex items-center gap-1 rounded-md bg-gray-50 px-2 py-0.5 font-medium text-gray-600">
            {STYLE_LABEL[exam.style]}
          </span>
          {exam.duration > 0 && (
            <>
              <Dot />
              <Stat icon={<Clock className="size-3.5" />} label={`${exam.duration} min`} />
            </>
          )}
          {exam.usage && (
            <>
              <Dot />
              <span className="inline-flex items-center gap-1 rounded-md bg-brand-primary/10 px-2 py-0.5 font-medium text-brand-primary">
                <Sparkles className="size-3" />
                {exam.usage.credits} créditos
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {mode === "view" ? (
          <>
            <CopyLinkButton shareId={exam.shareId} />
            <Button variant="outline" size="md" asChild>
              <Link href={`/app/analises/provas/${exam.id}`}>
                <BarChart3 className="size-4" />
                Análises
              </Link>
            </Button>
            <Button variant="outline" size="md" asChild>
              <Link href={`/app/provas/${exam.id}/scanner`}>
                <ScanLine className="size-4" />
                Scanner
              </Link>
            </Button>
            <Button variant="outline" size="md" onClick={onExport}>
              <FileDown className="size-4" />
              Exportar
            </Button>
            <Button variant="outline" size="md" onClick={onEditMetadata}>
              <Pencil className="size-4" />
              Editar infos
            </Button>
            <Button variant="primary" size="md" onClick={onEnterEdit}>
              <PencilLine className="size-4" />
              Editar questões
            </Button>
            <Button
              type="button"
              onClick={onDelete}
              className="bg-red-50 text-red-700 hover:bg-red-100"
              size="md"
            >
              <Trash2 className="size-4" />
              Excluir
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" size="md" onClick={onDiscardEdit} disabled={saving}>
              <X className="size-4" />
              Descartar
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={onSave}
              disabled={saving || !dirty}
            >
              <Save className="size-4" strokeWidth={2.5} />
              {saving ? "Salvando..." : dirty ? "Salvar alterações" : "Sem alterações"}
            </Button>
          </>
        )}
      </div>
    </header>
  );
}

function Stat({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      {icon}
      {label}
    </span>
  );
}

function Dot() {
  return <span className="size-0.5 rounded-full bg-gray-300" />;
}

function ViewMode({ exam }: { exam: ExamDetailDTO }) {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section className="flex flex-col gap-3">
        <div className="inline-flex w-fit items-center gap-2 rounded-pill bg-ink px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-white">
          <PencilLine className="size-3" />
          Minha visão — gabarito visível
        </div>
        {exam.questions.map((q, i) => (
          <ReadOnlyQuestion key={i} index={i} question={q} />
        ))}
      </section>

      <aside className="xl:sticky xl:top-[88px] xl:self-start xl:h-[calc(100vh-120px)]">
        <StudentPreview
          title={exam.title}
          description={exam.description}
          duration={exam.duration}
          questions={exam.questions}
        />
      </aside>
    </div>
  );
}

interface ReadOnlyQuestionProps {
  index: number;
  question: GeneratedQuestion;
}

const DIFFICULTY_CLASS: Record<string, string> = {
  fácil: "bg-emerald-50 text-emerald-700",
  médio: "bg-amber-50 text-amber-700",
  difícil: "bg-red-50 text-red-700",
};

function ReadOnlyQuestion({ index, question }: ReadOnlyQuestionProps) {
  return (
    <article className="rounded-2xl border border-gray-100 bg-white p-5">
      <header className="mb-3 flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-lg bg-gray-50 font-serif text-sm italic text-gray-500">
          {index + 1}
        </span>
        <span
          className={cn(
            "rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.05em]",
            DIFFICULTY_CLASS[question.difficulty] ?? "bg-gray-100 text-gray-600",
          )}
        >
          {question.difficulty}
        </span>
        <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
          {question.type === "multipleChoice" ? "múltipla" : "V/F"}
        </span>
      </header>

      {question.context && (
        <p className="mb-3 rounded-xl border border-gray-100 bg-gray-50 px-3.5 py-2.5 text-sm leading-relaxed text-gray-600">
          {question.context}
        </p>
      )}
      <p className="mb-4 text-[15px] font-medium leading-relaxed text-ink">
        {question.statement}
      </p>

      <ul className="mb-4 flex flex-col gap-1.5">
        {question.options.map((opt, j) => {
          const correct = j === question.correctAnswer;
          return (
            <li
              key={j}
              className={cn(
                "flex items-center gap-2.5 rounded-xl border px-3 py-2 text-sm",
                correct
                  ? "border-brand-primary/30 bg-brand-primary/5 text-brand-primary"
                  : "border-gray-100 text-gray-600",
              )}
            >
              <span
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-md text-[10px] font-medium",
                  correct ? "bg-brand-primary text-white" : "bg-gray-50 text-gray-400",
                )}
              >
                {String.fromCharCode(65 + j)}
              </span>
              {opt}
            </li>
          );
        })}
      </ul>

      {question.explanation && (
        <div className="rounded-xl border border-gray-100 bg-gray-50/50 px-3.5 py-3 text-[13px] leading-relaxed text-gray-600">
          <div className="mb-1 text-[10px] font-medium uppercase tracking-[0.08em] text-gray-400">
            Gabarito comentado
          </div>
          {question.explanation}
        </div>
      )}
    </article>
  );
}

function EditMode({
  draft,
  setDraft,
  style,
}: {
  draft: GeneratedQuestion[];
  setDraft: (q: GeneratedQuestion[]) => void;
  style: ExamDetailDTO["style"];
}) {
  const [lastAddedIndex, setLastAddedIndex] = useState<number | null>(null);

  function updateQuestion(index: number, patch: Partial<GeneratedQuestion>) {
    setDraft(draft.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  }
  function removeQuestion(index: number) {
    setDraft(draft.filter((_, i) => i !== index));
  }
  function addQuestion() {
    const needsContext = style !== "simple";
    const blank: GeneratedQuestion = {
      type: "multipleChoice",
      statement: "",
      context: needsContext ? "" : null,
      options: ["", "", "", ""],
      correctAnswer: 0,
      explanation: "",
      difficulty: "médio",
    };
    setDraft([...draft, blank]);
    setLastAddedIndex(draft.length);
  }

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-3 pb-24">
      <div className="mb-2 inline-flex w-fit items-center gap-2 rounded-pill bg-brand-primary px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-white">
        <PencilLine className="size-3" />
        Modo edição
      </div>
      {draft.length === 0 && (
        <div className="rounded-2xl border border-dashed border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-700">
          A prova precisa ter ao menos 1 questão. Adicione uma abaixo.
        </div>
      )}
      {draft.map((question, i) => (
        <QuestionEditor
          key={i}
          index={i}
          question={question}
          onChange={(patch) => updateQuestion(i, patch)}
          onRemove={() => removeQuestion(i)}
          defaultExpanded={i === lastAddedIndex}
        />
      ))}

      <button
        type="button"
        onClick={addQuestion}
        className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-200 bg-white px-5 py-5 text-sm font-medium text-gray-500 transition-colors hover:border-brand-primary hover:bg-brand-primary/5 hover:text-brand-primary"
      >
        <Plus className="size-4" strokeWidth={2.5} />
        Adicionar questão manualmente
      </button>
    </section>
  );
}

function cloneQuestion(q: GeneratedQuestion): GeneratedQuestion {
  return {
    type: q.type,
    statement: q.statement,
    context: q.context,
    options: [...q.options],
    correctAnswer: q.correctAnswer,
    explanation: q.explanation,
    difficulty: q.difficulty,
  };
}

function CopyLinkButton({ shareId }: { shareId: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      const url = `${window.location.origin}/exam/${shareId}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* silencioso — se o clipboard falhar, usuário copia manualmente */
    }
  }

  return (
    <Button type="button" variant="outline" size="md" onClick={handleCopy}>
      {copied ? (
        <>
          <Check className="size-4" strokeWidth={2.5} />
          Link copiado
        </>
      ) : (
        <>
          <Link2 className="size-4" />
          Copiar link
        </>
      )}
    </Button>
  );
}
