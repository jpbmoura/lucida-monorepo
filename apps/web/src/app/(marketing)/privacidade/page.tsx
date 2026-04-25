import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/features/marketing/legal/legal-page";

export const metadata: Metadata = {
  title: "Política de privacidade",
  description:
    "Como a Lucida coleta, usa e protege os dados dos professores e alunos.",
};

export default function PrivacidadeRoute() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Política de"
      titleEmphasis="privacidade"
      updatedAt="23 de abril de 2026"
    >
      <p>
        Esta política descreve como a Lucida coleta, usa, armazena e
        compartilha informações pessoais. Ela se aplica à plataforma web
        (lucidaexam.com) e aos serviços associados.
      </p>

      <LegalSection title="1. Dados coletados">
        <p>
          <strong>Do professor</strong>: nome, e-mail, senha (hasheada),
          método de pagamento (guardado pelo Stripe — a Lucida não armazena
          cartão), dados de uso (provas geradas, consumo de créditos, logs
          de navegação).
        </p>
        <p>
          <strong>Dos alunos</strong>: nome, código numérico, matrícula e
          e-mail opcional — cadastrados pelo professor, apenas pra uso
          dentro da turma dele. A Lucida não usa esses dados pra nenhuma
          outra finalidade.
        </p>
        <p>
          <strong>Submissões</strong>: respostas dos alunos, notas, timestamps
          e, no modo estrito, contadores de integridade (troca de aba,
          tentativas de cópia).
        </p>
      </LegalSection>

      <LegalSection title="2. Como usamos">
        <p>
          Pra operar o serviço — gerar provas, correlacionar submissões,
          exibir análises pro professor. Dados de uso anonimizados podem ser
          usados pra melhorar a IA e métricas de produto.
        </p>
        <p>
          Nunca vendemos dados. Nunca compartilhamos dados pessoais com
          terceiros pra marketing.
        </p>
      </LegalSection>

      <LegalSection title="3. Processadores terceiros">
        <p>
          Pra operar a plataforma, compartilhamos dados estritamente
          necessários com:
        </p>
        <ul className="list-inside list-disc space-y-1.5 pl-1">
          <li>
            <strong>Stripe</strong> — processamento de pagamentos
          </li>
          <li>
            <strong>OpenAI</strong> — geração de questões (material enviado
            é transmitido pra API da OpenAI; não é usado pra treinar modelos
            conforme contrato empresarial)
          </li>
          <li>
            <strong>MongoDB Atlas</strong> — armazenamento
          </li>
          <li>
            <strong>Provedor de e-mail transacional</strong> — envio de
            verificações, recibos e avisos
          </li>
          <li>
            <strong>Analytics</strong> — métricas agregadas e anônimas de
            uso do produto
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Direitos do titular (LGPD)">
        <p>
          Você tem direito a acessar, corrigir, excluir ou portar seus dados
          pessoais, além de revogar consentimentos. Pra exercer esses
          direitos, escreve pra{" "}
          <Link
            href="mailto:privacidade@lucidaexam.com"
            className="text-brand-primary underline"
          >
            privacidade@lucidaexam.com
          </Link>
          . A resposta vem em até 15 dias.
        </p>
      </LegalSection>

      <LegalSection title="5. Retenção">
        <p>
          Dados da conta são mantidos enquanto a conta está ativa. Após
          solicitação de exclusão, dados pessoais são apagados em até 30
          dias, exceto quando há obrigação legal de retenção (ex.: fiscal,
          por 5 anos).
        </p>
        <p>
          Submissões de alunos são mantidas enquanto a turma/prova existir.
          Se o professor excluir a turma, as submissões vinculadas também
          são removidas.
        </p>
      </LegalSection>

      <LegalSection title="6. Segurança">
        <p>
          Dados em trânsito: HTTPS obrigatório. Senhas: hash com Argon2.
          Dados em repouso no MongoDB Atlas com criptografia nativa. Acesso
          administrativo restrito e auditado.
        </p>
      </LegalSection>

      <LegalSection title="7. Cookies">
        <p>
          Usamos cookies estritamente necessários (autenticação,
          preferências). Não usamos cookies de publicidade.
        </p>
      </LegalSection>

      <LegalSection title="8. Alterações">
        <p>
          Mudanças nesta política são anunciadas por e-mail pros usuários
          cadastrados e ficam sinalizadas com uma nova data de atualização
          no topo.
        </p>
      </LegalSection>

      <LegalSection title="9. Contato">
        <p>
          Encarregado de dados (DPO):{" "}
          <Link
            href="mailto:privacidade@lucidaexam.com"
            className="text-brand-primary underline"
          >
            privacidade@lucidaexam.com
          </Link>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
