import type { SlideTheme } from "../types";

export interface ThemeMeta {
  id: SlideTheme;
  label: string;
  description: string;
  /** Cores de prévia pro seletor (bg + accent). */
  swatch: { bg: string; ink: string; accent: string };
}

export const THEMES: ThemeMeta[] = [
  {
    id: "papel",
    label: "Papel",
    description: "Sóbrio e tipográfico — exatas e ciências.",
    swatch: { bg: "#f4efe3", ink: "#1b2a24", accent: "#0e8c6f" },
  },
  {
    id: "minimo",
    label: "Mínimo",
    description: "Respiro máximo — ensino médio e conteúdo denso.",
    swatch: { bg: "#fbfaf7", ink: "#15161a", accent: "#b0542e" },
  },
  {
    id: "lousa",
    label: "Lousa",
    description: "Fundo escuro — faculdade e aula expositiva.",
    swatch: { bg: "#13171b", ink: "#e9eef2", accent: "#2dd4bf" },
  },
  {
    id: "ludico",
    label: "Lúdico",
    description: "Formas amigáveis — anos iniciais.",
    swatch: { bg: "#fff7e8", ink: "#2a2140", accent: "#ff8a3d" },
  },
  {
    id: "vivido",
    label: "Vívido",
    description: "Ousado e expressivo — humanas e línguas.",
    swatch: { bg: "#f6f7fb", ink: "#0e1a2b", accent: "#2348f0" },
  },
];

export const THEME_CLASS: Record<SlideTheme, string> = {
  papel: "deck-theme-papel",
  minimo: "deck-theme-minimo",
  lousa: "deck-theme-lousa",
  ludico: "deck-theme-ludico",
  vivido: "deck-theme-vivido",
};
