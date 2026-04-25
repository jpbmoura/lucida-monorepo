import { NextResponse, type NextRequest } from "next/server";

// Nome do cookie segue o cookiePrefix da BA (lucida) — ver auth.ts do api.
const SESSION_COOKIE = "lucida.session_token";

// Rotas protegidas. Cada entry define o prefix e pra onde mandar o user
// caso ele não tenha sessão — `/app` (professor) manda pro sign-in padrão;
// `/analytics` (instituição) manda pro login de organização. A distinção é
// só de UX — o endpoint de auth é o mesmo.
const PROTECTED: Array<{ prefix: string; signInPath: string }> = [
  { prefix: "/app", signInPath: "/sign-in" },
  { prefix: "/analytics", signInPath: "/organizacoes/entrar" },
  // Kintal: backoffice interno. Middleware só garante que há sessão — o
  // layout protegido em /kintal/(app) confere `role === "staff"` com a
  // sessão completa (additionalFields não são lidos no edge).
  { prefix: "/kintal", signInPath: "/kintal/entrar" },
];

// Rotas públicas que caem dentro de um prefixo protegido (escape hatch).
const PUBLIC_WITHIN_PROTECTED = ["/kintal/entrar"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (
    PUBLIC_WITHIN_PROTECTED.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`),
    )
  ) {
    return NextResponse.next();
  }

  const match = PROTECTED.find((p) => pathname.startsWith(p.prefix));
  if (!match) return NextResponse.next();

  const hasSession = request.cookies.has(SESSION_COOKIE);
  if (hasSession) return NextResponse.next();

  const signInUrl = new URL(match.signInPath, request.url);
  signInUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(signInUrl);
}

export const config = {
  matcher: ["/app/:path*", "/analytics/:path*", "/kintal/:path*"],
};
