import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/features/marketing/legal/legal-page";

export const metadata: Metadata = {
  title: "Termos de uso",
  description:
    "Regras de uso da plataforma Lucida — planos, créditos, cancelamento, reembolso.",
};

export default function TermosRoute() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Termos"
      titleEmphasis="de uso"
      updatedAt="23 de abril de 2026"
    >
      <p>
        Estes termos regulam o uso da plataforma Lucida (&quot;Serviço&quot;),
        operada por Lucida Educação Ltda. Ao criar uma conta, você declara que
        leu, entendeu e concorda com o que está aqui.
      </p>

      <LegalSection title="1. O que a Lucida faz">
        <p>
          Ferramentas de IA para professores — geração de provas, correção
          automática e análise de desempenho. As funcionalidades exatas
          disponíveis dependem do plano contratado.
        </p>
      </LegalSection>

      <LegalSection title="2. Cadastro e responsabilidades">
        <p>
          Você é responsável por manter sua senha em sigilo e por toda
          atividade na sua conta. A Lucida pode suspender contas com atividade
          suspeita, uso abusivo dos serviços de IA ou violação destes termos.
        </p>
        <p>
          Professores são responsáveis pelo conteúdo que enviam pra geração
          de provas — incluindo direitos autorais do material de origem.
        </p>
      </LegalSection>

      <LegalSection title="3. Planos e créditos">
        <p>
          A cobrança é por créditos consumidos. Cada ação com IA consome uma
          quantidade proporcional ao material e à complexidade — o valor
          estimado é mostrado antes de cada ação.
        </p>
        <p>
          Planos mensais renovam a cada 30 dias, zerando o saldo não
          utilizado antes do novo depósito. Planos anuais são creditados
          integralmente na ativação e o saldo renova a cada aniversário,
          também zerando o que sobrar.
        </p>
        <p>
          Pacotes avulsos (top-ups) são compras únicas sem renovação
          automática, com validade de 12 meses a partir da compra.
        </p>
      </LegalSection>

      <LegalSection title="4. Cancelamento">
        <p>
          Você pode cancelar a qualquer momento pelo portal de pagamento. O
          acesso fica ativo até o fim do ciclo já pago. Créditos de
          assinatura expiram no fim do ciclo; créditos avulsos permanecem até
          o fim da validade original.
        </p>
      </LegalSection>

      <LegalSection title="5. Reembolso">
        <p>
          Código de Defesa do Consumidor (CDC): você pode pedir reembolso
          integral em até 7 dias após a contratação, desde que menos de 10%
          dos créditos do período tenham sido consumidos.
        </p>
        <p>
          Para planos anuais com créditos entregues integralmente, não há
          reembolso proporcional por créditos já consumidos após o período
          de arrependimento.
        </p>
      </LegalSection>

      <LegalSection title="6. Uso aceitável">
        <p>
          É proibido usar a Lucida pra gerar conteúdo ilegal, discriminatório
          ou que viole direitos de terceiros. A Lucida se reserva o direito
          de revisar conteúdos reportados e suspender contas infratoras.
        </p>
      </LegalSection>

      <LegalSection title="7. Limitação de responsabilidade">
        <p>
          A Lucida é uma ferramenta de auxílio — não substitui o julgamento
          pedagógico do professor. Conteúdos gerados por IA devem ser
          revisados antes de serem aplicados aos alunos. A Lucida não se
          responsabiliza por notas ou decisões pedagógicas baseadas
          exclusivamente em saídas da IA.
        </p>
      </LegalSection>

      <LegalSection title="8. Alterações nos termos">
        <p>
          Podemos atualizar esses termos. Alterações materiais serão
          comunicadas por e-mail com antecedência de 30 dias. Seguir usando
          o serviço após a alteração implica aceite dos novos termos.
        </p>
      </LegalSection>

      <LegalSection title="9. Contato">
        <p>
          Dúvidas sobre estes termos? Escreve pra{" "}
          <Link
            href="mailto:contato@lucidaexam.com"
            className="text-brand-primary underline"
          >
            contato@lucidaexam.com
          </Link>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
