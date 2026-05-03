"use client";

import { useState } from "react";
import { ArrowRight, Mail, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EmailEntryProps {
  examTitle: string;
  examDescription: string;
  questionCount: number;
  duration: number;
  securityLevel: "off" | "strict";
  onSubmit: (input: { email: string; name: string }) => Promise<void>;
  onSwitchToCode: () => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function EmailEntry({
  examTitle,
  examDescription,
  questionCount,
  duration,
  securityLevel,
  onSubmit,
  onSwitchToCode,
}: EmailEntryProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedEmail = email.trim();
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setError("Digite seu nome (no mínimo 2 caracteres).");
      return;
    }
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setError("Email inválido.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await onSubmit({ email: trimmedEmail, name: trimmedName });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const canSubmit = name.trim().length >= 2 && EMAIL_REGEX.test(email.trim());

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-8 px-5 py-12 md:px-0">
      <header className="flex flex-col gap-3">
        <div className="inline-flex w-fit items-center gap-2 text-xs font-medium uppercase tracking-[0.15em] text-gray-400">
          <span className="pulse-dot" />
          Prova
        </div>
        <h1 className="text-3xl font-medium leading-tight tracking-tighter text-ink md:text-4xl">
          {examTitle}
        </h1>
        {examDescription && (
          <p className="text-[15px] text-gray-500">{examDescription}</p>
        )}
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1 rounded-md bg-gray-50 px-2 py-0.5">
            {questionCount} {questionCount === 1 ? "questão" : "questões"}
          </span>
          {duration > 0 && (
            <>
              <span className="size-0.5 rounded-full bg-gray-300" />
              <span className="inline-flex items-center gap-1 rounded-md bg-gray-50 px-2 py-0.5">
                {duration} min
              </span>
            </>
          )}
        </div>
      </header>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-5 rounded-2xl border border-gray-100 bg-white p-6"
      >
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-primary/10 text-brand-primary">
            <Mail className="size-5" />
          </span>
          <div>
            <div className="text-sm font-medium text-ink">Identifique-se para começar</div>
            <div className="text-[12px] text-gray-500">
              Digite seu nome e email para acessar a prova.
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="student-name">Nome completo</Label>
          <Input
            id="student-name"
            autoFocus
            autoComplete="name"
            placeholder="Como você quer ser identificado"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError(null);
            }}
            maxLength={120}
            aria-invalid={error ? true : undefined}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="student-email">Email</Label>
          <Input
            id="student-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError(null);
            }}
            aria-invalid={error ? true : undefined}
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        {securityLevel === "strict" && (
          <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12px] leading-relaxed text-amber-800">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" />
            <div>
              <div className="font-medium">Modo estrito ativado</div>
              <div className="mt-0.5 text-amber-700">
                Troca de aba, cópia e atalhos ficam bloqueados. 3 violações
                finalizam a prova automaticamente.
              </div>
            </div>
          </div>
        )}

        <Button type="submit" variant="primary" size="lg" disabled={busy || !canSubmit}>
          {busy ? "Iniciando..." : "Começar"}
          {!busy && <ArrowRight className="size-4" />}
        </Button>

        <button
          type="button"
          onClick={onSwitchToCode}
          className="text-[12px] text-gray-500 underline-offset-2 hover:text-ink hover:underline"
        >
          Já tenho código de acesso
        </button>
      </form>
    </div>
  );
}
