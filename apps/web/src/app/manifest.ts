import type { MetadataRoute } from "next";

/**
 * Web App Manifest servido em /manifest.webmanifest. Torna a Lucida instalável
 * ("Adicionar à tela inicial"). Ícones são gerados sob demanda — ver
 * src/app/icon-*.png/route.ts. start_url aponta pro app do professor.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lucida",
    short_name: "Lucida",
    description:
      "Crie provas com IA, corrija automaticamente e acompanhe o desempenho da turma.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#007AFF",
    lang: "pt-BR",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
