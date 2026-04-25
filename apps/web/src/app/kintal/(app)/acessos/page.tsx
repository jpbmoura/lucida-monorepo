import type { Metadata } from "next";
import { getServerSession } from "@/lib/get-server-session";
import { fetchStaff } from "@/features/kintal/acessos/data";
import { AcessosPageHeader } from "@/features/kintal/acessos/sections/page-header";
import { StaffList } from "@/features/kintal/acessos/sections/staff-list";

export const metadata: Metadata = {
  title: "Acessos",
};

export default async function KintalAcessosPage() {
  const [session, members] = await Promise.all([
    getServerSession(),
    fetchStaff(),
  ]);

  return (
    <div className="mx-auto w-full px-5 py-10 pb-20 md:px-10">
      <AcessosPageHeader />

      <div className="mt-10">
        <StaffList
          members={members}
          currentUserId={session?.user.id ?? ""}
        />
      </div>
    </div>
  );
}
