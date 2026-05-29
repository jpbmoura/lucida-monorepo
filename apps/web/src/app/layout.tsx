import type { Metadata, Viewport } from "next";
import { Poppins, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import "@/styles/globals.css";
import { ServiceWorkerRegistrar } from "@/components/pwa/service-worker-registrar";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});

// Usado em blocos de código e inline `<code>` nas páginas de /docs. Escolhido
// no lugar do `font-mono` do sistema porque este último varia muito entre
// plataformas (SF Mono no mac, Consolas no Windows, DejaVu no Linux) — um
// mono dedicado dá consistência visual nas docs.
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Lucida — Crie provas com IA em segundos",
    template: "%s · Lucida",
  },
  description:
    "Transforme seu material didático em avaliações completas em minutos. Aplicação online e offline, correção automática e análise de desempenho.",
  metadataBase: new URL("https://lucidaexam.com"),
  manifest: "/manifest.webmanifest",
  // Ícones gerados sob demanda via next/og — ver src/app/icon-*.png/route.ts.
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-icon.png",
  },
  // Habilita modo standalone no iOS ("Adicionar à tela de início").
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Lucida",
  },
};

// viewportFit:"cover" deixa o app desenhar atrás do notch/safe-areas no iOS —
// as barras fixas compensam com env(safe-area-inset-*) via classes .safe-*.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      className={`${poppins.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <ServiceWorkerRegistrar />
        {children}
      </body>
    </html>
  );
}
