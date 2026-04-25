import { OverviewSummary } from "./components/overview-summary";
import { PeriodFilter } from "./components/period-filter";
import { ExamsSection } from "./components/exams-section";
import { ClassesSection } from "./components/classes-section";
import { ComingSoonSection } from "./components/coming-soon-section";
import type { OverviewDTO, OverviewPeriod } from "./data";

interface AnalisesPageProps {
  overview: OverviewDTO;
  period: OverviewPeriod;
}

export function AnalisesPage({ overview, period }: AnalisesPageProps) {
  const hasData = overview.summary.submissionsReceived > 0;

  return (
    <div className="mx-auto w-full px-5 py-8 md:px-10">
      <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.15em] text-gray-400">
            <span className="pulse-dot" />
            Análises
          </div>
          <h1 className="text-3xl font-medium leading-tight tracking-tighter text-ink md:text-4xl">
            Como andam suas{" "}
            <span className="font-serif font-normal italic text-brand-primary">
              turmas
            </span>
            ?
          </h1>
          <p className="mt-2 max-w-xl text-[15px] text-gray-500">
            Visão agregada da atividade. Para ver números de uma turma
            específica, entre na página dela.
          </p>
        </div>
        <PeriodFilter active={period} />
      </header>

      <OverviewSummary summary={overview.summary} />

      <ExamsSection
        activity={overview.activity}
        scoreDistribution={overview.scoreDistribution}
        lowPerformanceExams={overview.lowPerformanceExams}
        hasData={hasData}
      />

      <ClassesSection
        classesRanking={overview.classesRanking}
        atRiskStudents={overview.atRiskStudents}
      />

      <ComingSoonSection />
    </div>
  );
}
