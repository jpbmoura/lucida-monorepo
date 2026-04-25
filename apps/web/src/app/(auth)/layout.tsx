// Shell passthrough — cada page de auth monta seu próprio par
// <AuthFormSide> + <AuthBrandPanel variant>, porque o tom (Exam azul ou
// Analytics roxo) depende do contexto (/sign-in vs /organizacoes/entrar).
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="grid min-h-screen lg:grid-cols-2">{children}</div>;
}
