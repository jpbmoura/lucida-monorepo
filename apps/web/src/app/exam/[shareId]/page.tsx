import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchPublicExam } from "@/features/public-exam/data";
import { PublicExam } from "@/features/public-exam/public-exam";

interface PageProps {
  params: Promise<{ shareId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { shareId } = await params;
  const exam = await fetchPublicExam(shareId);
  return {
    title: exam ? `${exam.title} — Prova` : "Prova",
    description: exam?.description || undefined,
  };
}

export default async function PublicExamPage({ params }: PageProps) {
  const { shareId } = await params;
  const exam = await fetchPublicExam(shareId);
  if (!exam) notFound();

  return <PublicExam exam={exam} />;
}
