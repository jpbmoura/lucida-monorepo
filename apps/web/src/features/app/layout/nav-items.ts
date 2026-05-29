import type { SidebarNavItem } from "./sidebar-nav";

// Fonte única das seções de navegação do app do professor. Consumido pela
// sidebar desktop (sidebar.tsx) e pelo drawer mobile (mobile-nav.tsx) pra que
// os dois nunca saiam de sincronia.

export const GERAL: SidebarNavItem[] = [
  { label: "Dashboard", href: "/app", icon: "layout" },
  { label: "Cursos", href: "/app/cursos", icon: "folder" },
];

export const FERRAMENTAS: SidebarNavItem[] = [
  // "Nova prova" não navega — abre dialog pra escolher a turma e daí vai
  // pro wizard. Ver NewExamSidebarRow + NewExamDialog.
  { label: "Nova prova", action: "new-exam", icon: "file" },
  // "Scanner" também não navega — abre dialog pra escolher turma → prova
  // e daí vai pra /app/provas/:id/scanner.
  { label: "Scanner", action: "scanner", icon: "scan" },
  { label: "Análises", href: "/app/analises", icon: "chart" },
  // "Nova aula" não navega — abre dialog pra escolher a turma e daí vai pro
  // wizard de plano de aula. Ver NewLessonPlanSidebarRow + NewLessonPlanDialog.
  { label: "Nova aula", action: "new-lesson-plan", icon: "book" },
  { label: "Novo Slide", icon: "presentation", disabled: true },
];

export const CONTA: SidebarNavItem[] = [
  {
    label: "Ajuda e suporte",
    href: "/app/ajuda",
    icon: "help",
  },
];
