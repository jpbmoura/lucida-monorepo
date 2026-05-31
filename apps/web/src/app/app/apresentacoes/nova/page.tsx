import { DeckWizard } from "@/features/app/apresentacoes/wizard";

export const metadata = { title: "Nova apresentação" };

interface PageProps {
  searchParams: Promise<{
    lessonPlanId?: string;
    title?: string;
    subject?: string;
    gradeLevel?: string;
  }>;
}

export default async function NovaApresentacaoPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const handoff =
    sp.lessonPlanId && sp.title
      ? {
          lessonPlanId: sp.lessonPlanId,
          title: sp.title,
          subject: sp.subject,
          gradeLevel: sp.gradeLevel,
        }
      : undefined;

  return <DeckWizard handoff={handoff} />;
}
