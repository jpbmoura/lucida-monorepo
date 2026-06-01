import { ComingSoonCard } from "./coming-soon-card";
import {
  AlpaClassLogo,
  GoogleClassroomLogo,
  MicrosoftTeamsLogo,
} from "./integration-logos";

/**
 * Grade genérica de integrações — cada card é uma integração. Todas marcadas
 * como "em breve" por enquanto. Adicionar uma nova integração = mais um card aqui.
 */
export function IntegrationsGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      <ComingSoonCard
        name="Google Classroom"
        description="Importe suas turmas e alunos do Google Classroom e mantenha tudo sincronizado por e-mail."
        logo={<GoogleClassroomLogo className="size-10" />}
      />
      <ComingSoonCard
        name="AlpaClass"
        description="Importe turmas e alunos da AlpaClass direto pra Lucida."
        logo={<AlpaClassLogo className="size-10" />}
      />
      <ComingSoonCard
        name="Microsoft Teams"
        description="Sincronize equipes e tarefas com o Teams for Education."
        logo={<MicrosoftTeamsLogo className="size-10" />}
      />
    </div>
  );
}
