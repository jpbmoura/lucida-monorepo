"use client";

import { useState } from "react";
import { ArrowRight, FileText, BookOpen, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { DropZone } from "@/features/app/provas/components/drop-zone";
import { deckHasUsableMaterial, useDeckWizardStore } from "../wizard-store";

export function StepSource() {
  const source = useDeckWizardStore((s) => s.source);
  const setSource = useDeckWizardStore((s) => s.setSource);
  const lessonPlanTitle = useDeckWizardStore((s) => s.lessonPlanTitle);
  const materialFiles = useDeckWizardStore((s) => s.materialFiles);
  const pastedText = useDeckWizardStore((s) => s.pastedText);
  const youtubeUrls = useDeckWizardStore((s) => s.youtubeUrls);
  const addMaterialFiles = useDeckWizardStore((s) => s.addMaterialFiles);
  const removeMaterialFile = useDeckWizardStore((s) => s.removeMaterialFile);
  const setPastedText = useDeckWizardStore((s) => s.setPastedText);
  const addYoutubeUrl = useDeckWizardStore((s) => s.addYoutubeUrl);
  const removeYoutubeUrl = useDeckWizardStore((s) => s.removeYoutubeUrl);
  const setStep = useDeckWizardStore((s) => s.setStep);

  const state = { source, materialFiles, pastedText, youtubeUrls, lessonPlanId: useDeckWizardStore((s) => s.lessonPlanId) };
  const canProceed = deckHasUsableMaterial(state);

  const [youtube, setYoutube] = useState("");

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Nova apresentação
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Comece de um plano de aula ou anexe seu material.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <SourceCard
          active={source === "lesson-plan"}
          disabled={!lessonPlanTitle}
          icon={<BookOpen className="size-5" />}
          title="Plano de aula"
          description={lessonPlanTitle ?? "Abra um plano em Aulas e gere a partir dele."}
          onClick={() => lessonPlanTitle && setSource("lesson-plan")}
        />
        <SourceCard
          active={source === "material"}
          icon={<FileText className="size-5" />}
          title="Material"
          description="PDF, DOCX, texto ou vídeo."
          onClick={() => setSource("material")}
        />
      </div>

      {source === "material" && (
        <div className="flex flex-col gap-5">
          <DropZone
            files={materialFiles}
            onAdd={addMaterialFiles}
            onRemove={removeMaterialFile}
          />
          <div className="flex flex-col gap-2">
            <Label htmlFor="paste">Ou cole um texto</Label>
            <Textarea
              id="paste"
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Cole aqui o conteúdo base da aula…"
              className="min-h-28"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="yt">Link de vídeo (YouTube)</Label>
            <div className="flex gap-2">
              <Input
                id="yt"
                value={youtube}
                onChange={(e) => setYoutube(e.target.value)}
                placeholder="https://youtube.com/…"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  addYoutubeUrl(youtube);
                  setYoutube("");
                }}
              >
                Adicionar
              </Button>
            </div>
            {youtubeUrls.length > 0 && (
              <ul className="flex flex-col gap-1">
                {youtubeUrls.map((url, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-1.5 text-xs text-gray-600"
                  >
                    <span className="truncate">{url}</span>
                    <button onClick={() => removeYoutubeUrl(i)} aria-label="Remover">
                      <X className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {source === "lesson-plan" && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
          A apresentação será gerada a partir do plano{" "}
          <span className="font-medium text-ink">{lessonPlanTitle}</span>.
        </div>
      )}

      <div className="flex justify-end">
        <Button disabled={!canProceed} onClick={() => setStep("config")}>
          Continuar <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function SourceCard({
  active,
  disabled,
  icon,
  title,
  description,
  onClick,
}: {
  active: boolean;
  disabled?: boolean;
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors",
        active
          ? "border-brand-primary bg-brand-primary/5"
          : "border-gray-200 hover:border-gray-300",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <span className={cn("rounded-lg p-2", active ? "bg-brand-primary text-white" : "bg-gray-100 text-gray-600")}>
        {icon}
      </span>
      <span className="font-medium text-ink">{title}</span>
      <span className="text-xs text-gray-500">{description}</span>
    </button>
  );
}
