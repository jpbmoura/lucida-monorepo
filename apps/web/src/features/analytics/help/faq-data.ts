import type { FaqItem } from "@/features/app/help/faq-data";

/**
 * FAQ institucional — voltado a owner/admin. Perguntas que o professor
 * individual não faz: convites, revogação, billing pooled, diferença de
 * produto Exam vs Analytics. O FAQ do /app (professor) fica em
 * @/features/app/help/faq-data.ts e é mostrado no /app/ajuda.
 */
export const INSTITUTIONAL_FAQ_ITEMS: FaqItem[] = [
  {
    question: "Como convido um professor pra minha instituição?",
    answer:
      "Em “Professores”, clique em “Convidar professor”. Informe o e-mail do docente e ele receberá um link de aceite por e-mail. Se ele já tem conta no Lucida, basta 1 clique pra entrar. Se ainda não tem, pode criar conta na própria página de aceite.",
  },
  {
    question: "O que acontece quando eu revogo o acesso de um professor?",
    answer:
      "Ele deixa de aparecer no painel da instituição e volta a ser um professor avulso. As turmas, provas, alunos e submissões continuam com ele — nada é apagado. Se ele estava consumindo créditos do pool, ele para e volta a usar a wallet pessoal (que ficou congelada enquanto era member).",
  },
  {
    question: "Como funcionam os créditos da instituição?",
    answer:
      "No modo “Ilimitado (pré-pago)” todos os docentes consomem do mesmo pote de créditos, recarregado pela instituição. A wallet pessoal de cada professor fica congelada enquanto ele é membro — só o saldo institucional é debitado em provas/regerações. Se a instituição fica sem créditos, a geração bloqueia e o professor vê uma mensagem pedindo pra falar com o administrador.",
  },
  {
    question: "Como recarregar os créditos da instituição?",
    answer:
      "Por enquanto a recarga é manual via script administrativo. Envie um pedido pelo formulário de suporte (ou WhatsApp) informando quantos créditos e o nome da instituição — a gente credita em seguida. Recarga self-service via Stripe está no roadmap.",
  },
  {
    question: "Qual a diferença entre “Lucida Exam” e “Lucida Analytics”?",
    answer:
      "Lucida Exam é o produto do professor individual: criar provas, aplicar, corrigir. Lucida Analytics é o ambiente da instituição — um painel de gestão onde você acompanha os docentes, vê métricas agregadas e gerencia cobrança coletiva. O mesmo professor pode ser avulso (só Exam) ou membro de uma instituição (aparece no Analytics do admin e continua usando o Exam normalmente).",
  },
  {
    question: "Posso ter professores de várias escolas numa mesma instituição?",
    answer:
      "Sim. Uma instituição no Lucida Analytics não precisa corresponder 1:1 a uma escola física — pode ser uma rede, um curso preparatório, uma franquia. O que importa é que todos os docentes convidados consumam do mesmo pote de créditos e apareçam no mesmo dashboard.",
  },
  {
    question: "Os outros modos de cobrança vão chegar quando?",
    answer:
      "O modo “Por professor” (limite individual mensal) e o “Pagar pelo uso” (pós-pago via fatura Stripe) estão no roadmap. O “Ilimitado (pré-pago)” atende a maior parte dos casos por enquanto. Se o seu cenário precisa de um dos outros modos, fale com a gente — a gente prioriza de acordo com a demanda.",
  },
  {
    question: "Meus dados de aluno/prova ficam visíveis pra outros da instituição?",
    answer:
      "Only para administradores (role owner/admin). Um professor comum só vê suas próprias turmas, provas e alunos — o painel de instituição é restrito. Cada docente mantém a propriedade dos dados que criou; a instituição tem visão agregada (métricas) mas não edita o conteúdo direto.",
  },
];
