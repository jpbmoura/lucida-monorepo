"use client";

import { DeckEditor } from "./components/deck-editor";
import { updateSlideDeckAction } from "./actions";
import type { SlideDeckDTO } from "./types";

// Página de edição de um deck salvo. Reusa o DeckEditor em modo "edit":
// onPersist atualiza via PUT. A regeneração de slide funciona sem material
// (contexto vem dos slides atuais) ou recarrega o plano de aula pela fonte.
export function DeckDetail({ deck }: { deck: SlideDeckDTO }) {
  return (
    <DeckEditor
      mode="edit"
      deckId={deck.id}
      initial={{
        slides: deck.slides,
        theme: deck.theme,
        title: deck.title,
        subject: deck.subject,
        gradeLevel: deck.gradeLevel,
        tone: deck.tone,
      }}
      genContext={{
        source: deck.source.type,
        lessonPlanId: deck.source.ref,
        tone: deck.tone,
        slideCount: deck.slides.length,
        includeNotes: deck.slides.some((s) => !!s.notes),
        includeActivity: deck.slides.some((s) => s.type === "activity"),
        language: "pt-BR",
        materialText: "",
        youtubeUrls: [],
      }}
      onPersist={async (payload) => {
        await updateSlideDeckAction(deck.id, {
          title: payload.title,
          subject: payload.subject,
          gradeLevel: payload.gradeLevel,
          tone: payload.tone,
          theme: payload.theme,
          slides: payload.slides,
        });
      }}
    />
  );
}
