import {
  Fraunces,
  Newsreader,
  Bricolage_Grotesque,
  Baloo_2,
  Unbounded,
  Hanken_Grotesk,
} from "next/font/google";

// Fontes dos 5 temas de slide, carregadas via next/font (self-hosted, sem FOIT).
// Cada uma expõe uma CSS var (--font-*) consumida pelos bundles de tema em
// themes.css. `deckFontVars` reúne as classes pra aplicar no container do deck —
// só as rotas de apresentação pagam o custo dessas fontes.

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-fraunces",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  display: "swap",
});

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-bricolage",
  display: "swap",
});

const baloo = Baloo_2({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-baloo",
  display: "swap",
});

const unbounded = Unbounded({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-unbounded",
  display: "swap",
});

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-hanken",
  display: "swap",
});

export const deckFontVars = [
  fraunces.variable,
  newsreader.variable,
  bricolage.variable,
  baloo.variable,
  unbounded.variable,
  hanken.variable,
].join(" ");
