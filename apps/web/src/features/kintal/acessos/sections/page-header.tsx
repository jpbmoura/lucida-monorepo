import { AddStaffDialog } from "../components/add-staff-dialog";

// Mesmo vocabulário do dashboard: eyebrow com pulse-dot + label, H1
// grande com destaque serif italic em cinza (mantém a paleta P&B do
// Kintal). O CTA primário aparece à direita — no lugar onde o Dashboard
// coloca o PeriodFilter.
export function AcessosPageHeader() {
  return (
    <div className="flex flex-col gap-6 border-b border-gray-100 pb-8 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0 flex-1">
        <div className="mb-3.5 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.15em] text-gray-400">
          <span className="pulse-dot" />
          Administração
        </div>
        <h1 className="text-4xl font-medium leading-[1.02] tracking-tighter text-ink md:text-[3.5rem]">
          Quem pode{" "}
          <span className="font-serif text-[1.1em] font-normal italic text-gray-500">
            acessar
          </span>
        </h1>
        <p className="mt-3.5 max-w-md text-[15px] leading-relaxed text-gray-500">
          Contas com acesso ao Kintal. Apenas quem está nessa lista consegue
          entrar no backoffice.
        </p>
      </div>

      <AddStaffDialog />
    </div>
  );
}
