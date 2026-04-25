import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/get-server-session";
import { fetchMembersAndInvitations } from "@/features/analytics/members/data";
import { NoActiveOrg } from "@/features/analytics/dashboard/sections/no-active-org";
import { InviteTeacherButton } from "@/features/analytics/members/components/invite-teacher-button";
import { MembersList } from "@/features/analytics/members/components/members-list";
import { InvitationsList } from "@/features/analytics/members/components/invitations-list";
import { Eyebrow } from "@/features/marketing/components/eyebrow";

export const metadata: Metadata = {
  title: "Professores · Instituição",
};

export default async function TeachersPage() {
  const session = await getServerSession();
  if (!session) redirect("/organizacoes/entrar?next=/analytics/professores");

  const data = await fetchMembersAndInvitations();

  if (!data) {
    return (
      <main className="flex-1 px-5 py-12 md:px-10">
        <NoActiveOrg />
      </main>
    );
  }

  return (
    <main className="flex-1 px-5 py-10 pb-20 md:px-10">
      <div className="mx-auto flex w-full flex-col gap-10">
        <header className="flex flex-col gap-5 border-b border-gray-100 pb-8 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-3">
            <Eyebrow>Professores</Eyebrow>
            <h1 className="text-4xl font-medium leading-[1.02] tracking-tighter text-ink md:text-[3rem]">
              Time da{" "}
              <span className="font-serif font-normal italic text-analytics-primary">
                instituição
              </span>
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-gray-500">
              Convide novos docentes, acompanhe quem já faz parte e gerencie os
              convites pendentes.
            </p>
          </div>

          <InviteTeacherButton />
        </header>

        <InvitationsList invitations={data.invitations} />

        <MembersList members={data.members} currentUserId={session.user.id} />
      </div>
    </main>
  );
}
