import "server-only";
import { cookies } from "next/headers";

export interface ServerSessionUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  emailVerified: boolean;
  role?: string | null;
  staffSince?: string | null;
}

export interface ServerSession {
  user: ServerSessionUser;
  session: { id: string; expiresAt: string };
}

// Lê a sessão da BA no server — fetch direto para a API (não passa pelo rewrite,
// que só existe no browser). Usa NEXT_PUBLIC_API_URL como URL interna.
export async function getServerSession(): Promise<ServerSession | null> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
  if (!cookieHeader) return null;

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";
  try {
    const res = await fetch(`${apiUrl}/api/auth/get-session`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as ServerSession | null;
    return data && "user" in data ? data : null;
  } catch {
    return null;
  }
}
