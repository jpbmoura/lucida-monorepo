"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/features/marketing/components/eyebrow";
import { cn } from "@/lib/utils";

interface FaqItem {
  q: string;
  a: string;
}

const ITEMS: FaqItem[] = [
  {
    q: "Eu preciso saber programar ou mexer com tecnologia avançada?",
    a: "Não. Você cola um texto ou anexa um PDF, escolhe o que quer (prova, slides, plano de aula) e em poucos minutos está com o material pronto. Sem etapas técnicas no caminho.",
  },
  {
    q: "Posso confiar no que a Lucida entrega?",
    a: "Sim. Tudo que a Lucida cria parte do seu próprio material — então o conteúdo é seu, no seu jeito de ensinar. Você revisa, edita ou regenera qualquer parte antes de aplicar. A palavra final é sempre sua.",
  },
  {
    q: "Funciona para prova impressa ou só online?",
    a: "Funciona dos dois jeitos. Você pode compartilhar a prova por link ou imprimir a folha de respostas. Para corrigir as folhas de papel, basta tirar uma foto — a Lucida lê o gabarito automaticamente.",
  },
  {
    q: "Posso cancelar quando quiser?",
    a: "Sim. Sem fidelidade, sem multa. Cancela direto no painel a qualquer momento e o acesso fica até o fim do ciclo já pago.",
  },
  {
    q: "Meus dados e os dos meus alunos ficam seguros?",
    a: "Tratamos os dados conforme a LGPD. Você é o titular das suas turmas e pode exportar ou apagar tudo a qualquer momento. Nada é compartilhado com terceiros.",
  },
  {
    q: "Tem plano para escolas e redes de ensino?",
    a: "Sim — o Lucida Analytics é o ambiente institucional, com gestão de equipe, saldo compartilhado e visão consolidada de todos os professores. Fale com a gente para um plano sob medida.",
  },
];

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="relative bg-gray-50 py-20 md:py-28">
      <Container size="default">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <Eyebrow>FAQ</Eyebrow>
          <h2 className="mt-4 text-4xl font-medium leading-[1.05] tracking-tighter text-ink md:text-5xl">
            Perguntas{" "}
            <span className="font-serif font-normal italic text-brand-primary">
              frequentes
            </span>
            .
          </h2>
        </div>

        <div className="mx-auto flex max-w-2xl flex-col gap-2">
          {ITEMS.map((item, i) => {
            const isOpen = open === i;
            return (
              <div
                key={item.q}
                className="overflow-hidden rounded-2xl border border-gray-100 bg-white"
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full cursor-pointer items-center justify-between gap-4 p-5 text-left md:p-6"
                  aria-expanded={isOpen}
                >
                  <span className="text-base font-medium text-ink md:text-lg">
                    {item.q}
                  </span>
                  <Plus
                    className={cn(
                      "size-5 shrink-0 text-brand-primary transition-transform duration-300",
                      isOpen && "rotate-45",
                    )}
                  />
                </button>
                <div
                  className={cn(
                    "grid transition-[grid-template-rows] duration-300 ease-out",
                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                  )}
                >
                  <div className="overflow-hidden">
                    <p className="px-5 pb-5 text-sm leading-relaxed text-gray-600 md:px-6 md:pb-6 md:text-base">
                      {item.a}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
