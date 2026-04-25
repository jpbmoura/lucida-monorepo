import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/get-server-session";
import {
  fetchTeacherOverview,
  type TeacherOverviewPeriod,
} from "@/features/analytics/teachers/data";
import { TeacherHeader } from "@/features/analytics/teachers/components/teacher-header";
import { TeacherKpiGrid } from "@/features/analytics/teachers/components/teacher-kpi-grid";
import { TeacherClassesList } from "@/features/analytics/teachers/components/teacher-classes-list";
import { TeacherExamsList } from "@/features/analytics/teachers/components/teacher-exams-list";
import { TeacherStudentsList } from "@/features/analytics/teachers/components/teacher-students-list";
import { TeacherLedgerSection } from "@/features/analytics/teachers/components/teacher-ledger-section";
import { InvitationErrorCard } from "@/features/accept-invite/components/invitation-error-card";

export const metadata: Metadata = {
  title: "Professor · Instituição",
};

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ period?: string }>;
}

export default async function TeacherDetailPage({
  params,
  searchParams,
}: PageProps) {
  const session = await getServerSession();
  const { id } = await params;
  if (!session) {
    redirect(`/organizacoes/entrar?next=/analytics/professores/${id}`);
  }

  const sp = await searchParams;
  const period = parsePeriod(sp.period);

  const data = await fetchTeacherOverview(id, period);

  if (!data) {
    return (
      <main className="flex-1 px-5 py-12 md:px-10">
        <InvitationErrorCard
          title="Professor não encontrado"
          message="Este professor não pertence à sua instituição, ou você não tem permissão pra visualizar. Volte pra lista pra tentar outro."
        />
      </main>
    );
  }

  return (
    <main className="flex-1 px-5 py-10 pb-20 md:px-10">
      <div className="mx-auto flex w-full flex-col gap-10">
        <TeacherHeader
          teacher={data.teacher}
          period={period}
          currentUserId={session.user.id}
        />

        <TeacherKpiGrid summary={data.summary} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <TeacherClassesList classes={data.classes} />
          <TeacherExamsList exams={data.recentExams} />
        </div>

        <TeacherStudentsList students={data.students} />

        <TeacherLedgerSection ledger={data.ledger} />
      </div>
    </main>
  );
}

function parsePeriod(raw: string | undefined): TeacherOverviewPeriod {
  if (raw === "7d" || raw === "30d" || raw === "90d" || raw === "all") {
    return raw;
  }
  return "30d";
}
