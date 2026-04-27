import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  fetchPublicExam,
  resolveExamLinkToken,
} from "@/features/public-exam/data";
import { PublicExam } from "@/features/public-exam/public-exam";
import { TokenError } from "@/features/public-exam/components/token-error";

interface PageProps {
  params: Promise<{ shareId: string; token: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { shareId } = await params;
  const exam = await fetchPublicExam(shareId);
  return {
    title: exam ? `${exam.title} — Prova` : "Prova",
    description: exam?.description || undefined,
  };
}

/**
 * Rota acessada via link gerado por
 * `POST /v1/public/exams/:id/share-link`. Server-side resolve o token
 * (sem criar submissão) e renderiza `PublicExam` com a tela de
 * boas-vindas direto — pula o input de código.
 *
 * Se o token for inválido (assinatura adulterada, prova removida, etc),
 * mostra `TokenError` com fallback pra entrar via código.
 */
export default async function PublicExamStartPage({ params }: PageProps) {
  const { shareId, token } = await params;
  const exam = await fetchPublicExam(shareId);
  if (!exam) notFound();

  const resolved = await resolveExamLinkToken(shareId, token);
  if (!resolved.ok) {
    return (
      <TokenError
        examTitle={exam.title}
        shareId={exam.shareId}
        message={resolved.message}
      />
    );
  }

  return (
    <PublicExam
      exam={exam}
      prefilledFromToken={{
        token,
        studentName: resolved.data.student.name,
        submission: resolved.data.submission,
      }}
    />
  );
}
