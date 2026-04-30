"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Check,
  KeyRound,
  Link2,
  Loader2,
  Lock,
  ShieldCheck,
  Unlink,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  changePasswordSchema,
  setPasswordSchema,
  type ChangePasswordInput,
  type SetPasswordInput,
} from "@/features/auth/schemas";

interface AccountSummary {
  /** ID da entrada na collection `account` do BA. */
  id: string;
  /** "credential" (email/senha) ou nome do social provider ("google"). */
  providerId: string;
}

interface Props {
  userEmail: string;
}

/**
 * Aba "Conta" das configurações. Duas funções:
 *
 *  1. Métodos de login: lista contas vinculadas (credential + Google).
 *     Permite vincular Google se ainda não vinculou; permite desvincular
 *     se houver mais de um método (preservando pelo menos um).
 *
 *  2. Senha: se o user tem credential, mostra "Alterar senha" (atual +
 *     nova). Se só tem Google, mostra "Definir senha" (sem campo atual).
 *
 * Lista atualizada via `authClient.listAccounts()` — chamada no mount e
 * depois de cada operação que mexe em accounts.
 */
export function AccountForm({ userEmail }: Props) {
  const [accounts, setAccounts] = useState<AccountSummary[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    setLoadError(null);
    const res = await authClient.listAccounts();
    if (res.error) {
      setLoadError(
        res.error.message ?? "Não foi possível carregar suas contas.",
      );
      return;
    }
    setAccounts(
      (res.data ?? []).map((a) => ({
        id: String(a.id),
        providerId: String(a.providerId),
      })),
    );
  }, []);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  if (loadError) {
    return (
      <div
        role="alert"
        className="rounded-2xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700"
      >
        {loadError}
      </div>
    );
  }

  if (accounts === null) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-gray-100 bg-white px-6 py-8 text-sm text-gray-500">
        <Loader2 className="size-4 animate-spin" />
        Carregando suas contas...
      </div>
    );
  }

  const hasCredential = accounts.some((a) => a.providerId === "credential");
  const hasGoogle = accounts.some((a) => a.providerId === "google");

  return (
    <div className="flex flex-col gap-6">
      <Section
        title="Métodos de login"
        description="Como você entra na sua conta. Vincular o Google deixa o login com 1 clique."
      >
        <ProviderRow
          provider="credential"
          email={userEmail}
          linked={hasCredential}
        />
        <ProviderRow
          provider="google"
          email={userEmail}
          linked={hasGoogle}
          canUnlink={hasGoogle && hasCredential}
          onMutate={loadAccounts}
        />
      </Section>

      <Section
        title={hasCredential ? "Alterar senha" : "Definir senha"}
        description={
          hasCredential
            ? "Mude sua senha atual. Suas outras sessões continuam ativas."
            : "Você entrou pela primeira vez via Google. Defina uma senha pra também poder entrar com email + senha."
        }
      >
        {hasCredential ? (
          <ChangePasswordSection />
        ) : (
          <SetPasswordSection onSuccess={loadAccounts} />
        )}
      </Section>
    </div>
  );
}

// ─── Provider row (credential / google) ──────────────────────────────

function ProviderRow({
  provider,
  email,
  linked,
  canUnlink = false,
  onMutate,
}: {
  provider: "credential" | "google";
  email: string;
  linked: boolean;
  canUnlink?: boolean;
  onMutate?: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const label = provider === "credential" ? "Email e senha" : "Google";
  const Icon = provider === "credential" ? KeyRound : GoogleGlyph;

  async function link() {
    setError(null);
    setBusy(true);
    try {
      // BA redireciona pra OAuth e na volta linka. Sem `await` porque
      // a página vai redirecionar.
      await authClient.linkSocial({
        provider: "google",
        callbackURL: "/app/configuracoes",
      });
    } catch (err) {
      setError((err as Error).message ?? "Não foi possível vincular.");
      setBusy(false);
    }
  }

  async function unlink() {
    setError(null);
    setBusy(true);
    try {
      const res = await authClient.unlinkAccount({
        providerId: provider,
      });
      if (res.error) {
        throw new Error(res.error.message ?? "Falha ao desvincular.");
      }
      await onMutate?.();
    } catch (err) {
      setError((err as Error).message ?? "Não foi possível desvincular.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-gray-100 bg-white p-4">
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-gray-50 text-ink">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-medium text-ink">{label}</div>
          <div className="truncate text-[12px] text-gray-500">{email}</div>
        </div>
        {linked ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
            <Check className="size-3" strokeWidth={3} />
            Vinculado
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
            Não vinculado
          </span>
        )}
      </div>

      {provider === "google" && (
        <div className="flex items-center justify-end gap-2">
          {!linked && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={link}
              disabled={busy}
            >
              {busy ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Link2 className="size-3.5" />
              )}
              Vincular Google
            </Button>
          )}
          {linked && canUnlink && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={unlink}
              disabled={busy}
              className="text-gray-600 hover:text-red-700"
            >
              {busy ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Unlink className="size-3.5" />
              )}
              Desvincular
            </Button>
          )}
          {linked && !canUnlink && (
            <span className="text-[11px] text-gray-400">
              Defina uma senha pra poder desvincular o Google.
            </span>
          )}
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

// ─── Senha: alterar (credential já existe) ───────────────────────────

function ChangePasswordSection() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
  });

  async function onSubmit(values: ChangePasswordInput) {
    setServerError(null);
    setSaved(false);
    const { error } = await authClient.changePassword({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
      revokeOtherSessions: false,
    });
    if (error) {
      setServerError(
        error.message ??
          "Não foi possível alterar a senha. Confira a senha atual.",
      );
      return;
    }
    form.reset({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setSaved(true);
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
      noValidate
    >
      <PasswordField
        id="currentPassword"
        label="Senha atual"
        autoComplete="current-password"
        register={form.register("currentPassword")}
        error={form.formState.errors.currentPassword?.message}
      />
      <PasswordField
        id="newPassword"
        label="Nova senha"
        autoComplete="new-password"
        register={form.register("newPassword")}
        error={form.formState.errors.newPassword?.message}
      />
      <PasswordField
        id="confirmPassword"
        label="Confirme a nova senha"
        autoComplete="new-password"
        register={form.register("confirmPassword")}
        error={form.formState.errors.confirmPassword?.message}
      />

      {serverError && (
        <p className="text-xs text-red-600" role="alert">
          {serverError}
        </p>
      )}

      <div className="flex items-center justify-end gap-3">
        {saved && (
          <span className="inline-flex items-center gap-1.5 text-sm text-emerald-700">
            <ShieldCheck className="size-4" />
            Senha alterada
          </span>
        )}
        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Lock className="size-4" />
          )}
          Alterar senha
        </Button>
      </div>
    </form>
  );
}

// ─── Senha: definir (user só tem Google) ─────────────────────────────

function SetPasswordSection({ onSuccess }: { onSuccess: () => Promise<void> }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const form = useForm<SetPasswordInput>({
    resolver: zodResolver(setPasswordSchema),
  });

  async function onSubmit(values: SetPasswordInput) {
    setServerError(null);
    setSaved(false);
    // BA expõe `setPassword` em `authClient` quando o user já tem sessão
    // mas ainda não tem credential account. Tipos públicos não cobrem
    // o método dinamicamente — cast localizado.
    const client = authClient as unknown as {
      setPassword: (input: { newPassword: string }) => Promise<{
        error?: { message?: string } | null;
      }>;
    };
    const { error } = await client.setPassword({
      newPassword: values.newPassword,
    });
    if (error) {
      setServerError(error.message ?? "Não foi possível definir a senha.");
      return;
    }
    form.reset({ newPassword: "", confirmPassword: "" });
    setSaved(true);
    await onSuccess();
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
      noValidate
    >
      <PasswordField
        id="newPassword"
        label="Nova senha"
        autoComplete="new-password"
        register={form.register("newPassword")}
        error={form.formState.errors.newPassword?.message}
      />
      <PasswordField
        id="confirmPassword"
        label="Confirme a senha"
        autoComplete="new-password"
        register={form.register("confirmPassword")}
        error={form.formState.errors.confirmPassword?.message}
      />

      {serverError && (
        <p className="text-xs text-red-600" role="alert">
          {serverError}
        </p>
      )}

      <div className="flex items-center justify-end gap-3">
        {saved && (
          <span className="inline-flex items-center gap-1.5 text-sm text-emerald-700">
            <ShieldCheck className="size-4" />
            Senha definida
          </span>
        )}
        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Lock className="size-4" />
          )}
          Definir senha
        </Button>
      </div>
    </form>
  );
}

// ─── Reusable bits ───────────────────────────────────────────────────

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6 md:p-7">
      <header className="mb-5 border-b border-gray-100 pb-4">
        <h2 className="text-base font-medium text-ink">{title}</h2>
        <p className="mt-0.5 text-[13px] text-gray-500">{description}</p>
      </header>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

function PasswordField({
  id,
  label,
  autoComplete,
  register,
  error,
}: {
  id: string;
  label: string;
  autoComplete: string;
  register: ReturnType<ReturnType<typeof useForm>["register"]>;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="password"
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        {...register}
      />
      {error && <p className={cn("text-xs text-red-600")}>{error}</p>}
    </div>
  );
}

function GoogleGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 18 18" aria-hidden className={className}>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.163-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}
