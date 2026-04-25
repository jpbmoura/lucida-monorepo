import type { Metadata } from "next";
import { PricingPage } from "@/features/marketing/pricing/pricing-page";

export const metadata: Metadata = {
  title: "Planos e preços",
  description:
    "Alunos, provas e correções ilimitados. Você paga só pelos créditos que a IA consome. Sem fidelidade.",
};

export default function PrecosRoute() {
  return <PricingPage />;
}
