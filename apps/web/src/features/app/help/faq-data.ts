export interface FaqItem {
  question: string;
  answer: string;
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    question: "Como crio minha primeira prova?",
    answer:
      "No menu lateral, clique em “Nova prova” e escolha a turma. O wizard pede contexto, material de referência (PDF, Word, texto colado ou link do YouTube) e configuração — quantidade de questões, duração e nível de dificuldade. A IA gera o conteúdo e você pode revisar ou regenerar questões antes de publicar.",
  },
  {
    question: "Como funciona o scanner de folhas de resposta?",
    answer:
      "Quando aplicar uma prova em papel, use o botão “Scanner” do menu. Escolha a turma e a prova, então tire uma foto ou digitalize a folha de respostas — o sistema reconhece as bolhas marcadas e lança a nota do aluno automaticamente. Casos duvidosos ficam marcados pra revisão manual.",
  },
  {
    question: "O que são créditos e como funcionam?",
    answer:
      "Cada ação de IA (gerar prova, regenerar questão) consome créditos proporcionais à complexidade — 1 crédito equivale a 100 tokens processados. Você recebe créditos todo mês com a assinatura, pode comprar pacotes avulsos e ganha um bônus de boas-vindas no cadastro. Veja saldo e histórico em “Saldo e assinatura”.",
  },
  {
    question: "Como compartilho uma prova com meus alunos?",
    answer:
      "Ao abrir uma prova, copie o link de compartilhamento — os alunos acessam pelo navegador e respondem online. Se preferir aplicar em papel, imprima ou exporte em PDF/Word; depois, use o Scanner pra digitalizar as folhas e lançar as notas.",
  },
  {
    question: "Como vejo as análises de desempenho?",
    answer:
      "Na aba “Análises” você tem visão agregada das turmas: média, distribuição de notas, alunos em risco e provas com pior desempenho. De qualquer ponto, você pode fazer drill-down até a turma, o aluno ou a prova específica pra entender onde estão os erros.",
  },
  {
    question: "Posso cancelar ou mudar de plano?",
    answer:
      "Sim, a qualquer momento. Em “Saldo e assinatura”, clique em “Gerenciar assinatura” — abre o portal do Stripe onde você pode mudar de plano, atualizar o cartão ou cancelar. Créditos já consumidos não são devolvidos, mas créditos ainda não usados continuam válidos até a data de expiração.",
  },
  {
    question: "Meus dados estão seguros?",
    answer:
      "Usamos criptografia em trânsito e em repouso, autenticação com padrões modernos e armazenamos apenas o mínimo necessário pra operar. Dados de alunos não são usados pra treinar modelos de IA. Detalhes completos na nossa Política de Privacidade.",
  },
];
