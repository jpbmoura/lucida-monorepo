"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DropZone } from "../components/drop-zone";
import { YoutubeInput } from "../components/youtube-input";
import { useWizardStore, canProceedToConfig } from "../wizard-store";

interface StepMaterialProps {
  classId: string;
}

export function StepMaterial({ classId }: StepMaterialProps) {
  const files = useWizardStore((s) => s.files);
  const pastedText = useWizardStore((s) => s.pastedText);
  const youtubeUrls = useWizardStore((s) => s.youtubeUrls);
  const addFiles = useWizardStore((s) => s.addFiles);
  const removeFile = useWizardStore((s) => s.removeFile);
  const setPastedText = useWizardStore((s) => s.setPastedText);
  const addYoutubeUrl = useWizardStore((s) => s.addYoutubeUrl);
  const removeYoutubeUrl = useWizardStore((s) => s.removeYoutubeUrl);
  const setStep = useWizardStore((s) => s.setStep);

  const canProceed = canProceedToConfig({ files, pastedText, youtubeUrls });
  const summary = buildSummary(files, pastedText, youtubeUrls);

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
        <DropZone files={files} onAdd={addFiles} onRemove={removeFile} />
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
          {canProceed && summary && (
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
          Continuar
          <ArrowRight className="size-4" />
        </Button>
      </footer>
    </div>
  );
}

// Resumo neutro — sem fingir contar tokens. Antes da extração no servidor
// não há como estimar texto a partir de bytes do PDF (binário comprimido).
// O custo real aparece no confirm dialog, calculado server-side.
function buildSummary(
  files: File[],
  pastedText: string,
  youtubeUrls: string[],
): string | null {
  const parts: string[] = [];
  if (files.length > 0) {
    parts.push(`${files.length} ${files.length === 1 ? "arquivo" : "arquivos"}`);
  }
  if (youtubeUrls.length > 0) {
    parts.push(
      `${youtubeUrls.length} ${youtubeUrls.length === 1 ? "vídeo" : "vídeos"}`,
    );
  }
  const pastedChars = pastedText.trim().length;
  if (pastedChars > 0) {
    parts.push(
      `${pastedChars.toLocaleString("pt-BR")} ${pastedChars === 1 ? "char" : "chars"} colados`,
    );
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}
