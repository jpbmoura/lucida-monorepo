"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DropZone } from "../components/drop-zone";
import { YoutubeInput } from "../components/youtube-input";
import {
  canProceedToConfig,
  useWizardStore,
  type MaterialFile,
} from "../wizard-store";

interface StepMaterialProps {
  classId: string;
}

export function StepMaterial({ classId }: StepMaterialProps) {
  const materialFiles = useWizardStore((s) => s.materialFiles);
  const pastedText = useWizardStore((s) => s.pastedText);
  const youtubeUrls = useWizardStore((s) => s.youtubeUrls);
  const addMaterialFiles = useWizardStore((s) => s.addMaterialFiles);
  const removeMaterialFile = useWizardStore((s) => s.removeMaterialFile);
  const setPastedText = useWizardStore((s) => s.setPastedText);
  const addYoutubeUrl = useWizardStore((s) => s.addYoutubeUrl);
  const removeYoutubeUrl = useWizardStore((s) => s.removeYoutubeUrl);
  const setStep = useWizardStore((s) => s.setStep);

  const canProceed = canProceedToConfig({
    materialFiles,
    pastedText,
    youtubeUrls,
  });
  const summary = buildSummary(materialFiles, pastedText, youtubeUrls);
  const isExtracting = materialFiles.some((mf) => mf.status === "extracting");

  return (
    <div className="flex flex-col gap-8">
      <header>
        <div className="mb-3 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.15em] text-gray-400">
          <span className="pulse-dot" />
          Etapa 1 de 3 · Material
        </div>
        <h1 className="text-3xl font-medium leading-tight tracking-tighter text-ink md:text-4xl">
          O que a Lulu vai{" "}
          <span className="font-serif font-normal italic text-brand-primary">estudar</span>?
        </h1>
        <p className="mt-3 max-w-lg text-[15px] text-gray-500">
          Envie arquivos, cole um trecho ou passe links de vídeos do YouTube. Combine fontes à vontade.
        </p>
      </header>

      <section>
        <DropZone
          files={materialFiles}
          onAdd={addMaterialFiles}
          onRemove={removeMaterialFile}
        />
      </section>

      <section className="flex flex-col gap-2">
        <Label htmlFor="pasted-text">Cole um texto (opcional)</Label>
        <Textarea
          id="pasted-text"
          value={pastedText}
          onChange={(e) => setPastedText(e.target.value)}
          placeholder="Cole aqui um trecho do material, uma definição, um texto-base..."
          className="min-h-[140px]"
        />
      </section>

      <section className="flex flex-col gap-2">
        <Label>Vídeos do YouTube (opcional)</Label>
        <YoutubeInput
          urls={youtubeUrls}
          onAdd={addYoutubeUrl}
          onRemove={removeYoutubeUrl}
        />
      </section>

      <footer className="flex flex-col gap-3 border-t border-gray-100 pt-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/app/turmas/${classId}`}>
              <ArrowLeft className="size-3.5" />
              Cancelar
            </Link>
          </Button>
          {summary && (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-gray-50 px-2 py-1 font-medium text-gray-600">
              <FileText className="size-3" />
              {summary}
            </span>
          )}
        </div>

        <Button
          variant="primary"
          size="lg"
          disabled={!canProceed}
          onClick={() => setStep("config")}
        >
          {isExtracting ? "Extraindo arquivos..." : "Continuar"}
          {!isExtracting && <ArrowRight className="size-4" />}
        </Button>
      </footer>
    </div>
  );
}

// Resumo conta caracteres reais agora — extração roda no browser, então
// dá pra somar os textos extraídos + colado e mostrar o tamanho concreto
// do material que vai pra IA.
function buildSummary(
  materialFiles: MaterialFile[],
  pastedText: string,
  youtubeUrls: string[],
): string | null {
  const parts: string[] = [];

  const doneFiles = materialFiles.filter((mf) => mf.status === "done");
  if (doneFiles.length > 0) {
    parts.push(
      `${doneFiles.length} ${doneFiles.length === 1 ? "arquivo" : "arquivos"}`,
    );
  }
  if (youtubeUrls.length > 0) {
    parts.push(
      `${youtubeUrls.length} ${youtubeUrls.length === 1 ? "vídeo" : "vídeos"}`,
    );
  }

  const totalChars =
    doneFiles.reduce((acc, mf) => acc + (mf.text?.length ?? 0), 0) +
    pastedText.trim().length;
  if (totalChars > 0) {
    parts.push(
      `${totalChars.toLocaleString("pt-BR")} ${totalChars === 1 ? "char" : "chars"}`,
    );
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}
