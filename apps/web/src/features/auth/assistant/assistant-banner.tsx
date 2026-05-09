import { ShieldCheck } from "lucide-react";

interface Props {
  teacherName: string | null;
  teacherEmail: string;
  assistantName: string | null;
  assistantEmail: string;
}

/**
 * Banner persistente no topo do /app quando a sessão é de um auxiliar
 * atendendo um professor. Reforça o contexto ("Você [auxiliar] está
 * acessando a conta de [professor]") e deixa explícito que a auditoria
 * registra o auxiliar, não o professor.
 *
 * O atalho pra trocar de conta vive no menu de perfil (canto superior
 * direito) — não duplicamos aqui pra evitar dois caminhos pra mesma
 * ação.
 */
export function AssistantBanner({
  teacherName,
  teacherEmail,
  assistantName,
  assistantEmail,
}: Props) {
  return (
    <div className="border-b border-amber-200 bg-amber-50 px-5 py-2.5 md:px-10">
      <div className="flex items-center gap-2 text-sm text-amber-900">
        <ShieldCheck className="size-4" />
        <span>
          Você (
          <strong className="font-semibold">
            {assistantName ?? assistantEmail}
          </strong>
          ) está acessando a conta de{" "}
          <strong className="font-semibold">
            {teacherName ?? teacherEmail}
          </strong>
          . Suas alterações ficam registradas em seu nome.
        </span>
      </div>
    </div>
  );
}
