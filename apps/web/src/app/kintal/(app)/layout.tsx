import { redirect } from "next/navigation";
import { KintalSidebar } from "@/features/kintal/layout/sidebar";
import { KintalTopbar } from "@/features/kintal/layout/topbar";
import { getServerSession } from "@/lib/get-server-session";
import { buildDisplayUser } from "@/lib/user-display";

// Guard do backoffice. Middleware já garante cookie de sessão; aqui
// conferimos `role === "staff"` via sessão completa da BA. User sem role
// cai de volta no sign-in com flag de erro (o form trata a mensagem).
export default async function KintalAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  if (!session) {
    redirect("/kintal/entrar?next=/kintal");
  }
  if (session.user.role !== "staff") {
    redirect("/kintal/entrar?error=forbidden");
  }

  const display = buildDisplayUser({
    name: session.user.name,
    email: session.user.email,
  });

  return (
    <div className="flex min-h-screen bg-white">
      <KintalSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <KintalTopbar
          userName={display.name}
          userEmail={display.email}
          initials={display.initials}
        />
        {children}
      </div>
    </div>
  );
}
