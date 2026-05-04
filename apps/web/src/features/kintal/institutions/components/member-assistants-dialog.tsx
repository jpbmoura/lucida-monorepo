"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus, ShieldCheck, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { buildDisplayUser } from "@/lib/user-display";
import { cn } from "@/lib/utils";
import {
  createMemberAssistantAction,
  fetchMemberAssistants,
  revokeMemberAssistantAction,
  type KintalMemberAssistantDTO,
} from "../assistants-data";

const SCHEMA = z.object({
  name: z.string().trim().min(1, "Informe o nome."),
  email: z.string().trim().email("Email inválido."),
  password: z.string().min(8, "Mínimo de 8 caracteres."),
});

type FormValues = z.infer<typeof SCHEMA>;

interface MemberAssistantsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  member: { id: string; name: string | null; email: string };
}

/**
 * Gestão dos auxiliares de um professor a partir do Kintal. A lista é
 * carregada lazy quando o dialog abre — evita N requisições por linha do
 * MembersPanel só pra contar quantos auxiliares cada um tem.
 */
export function MemberAssistantsDialog({
  open,
  onOpenChange,
  orgId,
  member,
}: MemberAssistantsDialogProps) {
  const display = buildDisplayUser({
    name: member.name,
    email: member.email,
    fallback: "email",
  });
  const [assistants, setAssistants] = useState<KintalMemberAssistantDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function reload() {
    setLoading(true);
    setLoadError(null);
    try {
      const list = await fetchMemberAssistants(orgId, member.id);
      setAssistants(list);
    } catch {
      setLoadError("Não foi possível carregar os auxiliares.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    setShowForm(false);
    void reload();
    // Dependência intencionalmente restrita — recarrega apenas ao reabrir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, orgId, member.id]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-gray-100 text-gray-600">
              <ShieldCheck className="size-4" />
            </span>
            Auxiliares
          </DialogTitle>
          <DialogDescription>
            Gerencia quem pode atuar em nome de{" "}
            <span className="font-medium text-ink">{display.name}</span>.
            Auxiliares logam com email/senha próprios; tudo que fazem fica
            registrado em nome do professor.
          </DialogDescription>
        </DialogHeader>

        {loadError && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700"
          >
            {loadError}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8 text-gray-400">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : assistants.length === 0 && !showForm ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/40 px-5 py-8 text-center">
            <p className="text-sm font-medium text-ink">
              Nenhum auxiliar cadastrado.
            </p>
            <p className="mt-1 text-[12px] text-gray-500">
              Use o botão abaixo pra criar uma credencial.
            </p>
          </div>
        ) : assistants.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {assistants.map((a) => (
              <AssistantRow
                key={a.id}
                orgId={orgId}
                assistant={a}
                onRevoked={reload}
              />
            ))}
          </ul>
        ) : null}

        {showForm ? (
          <CreateAssistantForm
            orgId={orgId}
            teacherId={member.id}
            onCreated={() => {
              setShowForm(false);
              void reload();
            }}
            onCancel={() => setShowForm(false)}
          />
        ) : (
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => onOpenChange(false)}
            >
              Fechar
            </Button>
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={() => setShowForm(true)}
            >
              <Plus className="size-4" />
              Adicionar auxiliar
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

function AssistantRow({
  orgId,
  assistant,
  onRevoked,
}: {
  orgId: string;
  assistant: KintalMemberAssistantDTO;
  onRevoked: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const display = buildDisplayUser({
    name: assistant.assistantName,
    email: assistant.assistantEmail,
    fallback: "email",
  });

  function handleRevoke() {
    if (
      !window.confirm(
        `Revogar o acesso de ${display.name}? A pessoa não consegue mais entrar na conta deste professor.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await revokeMemberAssistantAction(orgId, assistant.id);
      if (!res.ok) {
        window.alert(res.message);
        return;
      }
      onRevoked();
    });
  }

  return (
    <li className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-3 py-2.5">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-ink to-gray-600 text-[11px] font-semibold text-white">
        {display.initials}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-ink">
          {display.name}
        </div>
        <div className="truncate text-[11px] text-gray-500">
          {assistant.assistantEmail}
        </div>
      </div>
      <button
        type="button"
        onClick={handleRevoke}
        disabled={isPending}
        aria-label="Revogar auxiliar"
        className={cn(
          "grid size-7 shrink-0 place-items-center rounded-md text-gray-400 transition-colors",
          "hover:bg-red-50 hover:text-red-600 disabled:opacity-50",
        )}
      >
        {isPending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Trash2 className="size-3.5" />
        )}
      </button>
    </li>
  );
}

function CreateAssistantForm({
  orgId,
  teacherId,
  onCreated,
  onCancel,
}: {
  orgId: string;
  teacherId: string;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const form = useForm<FormValues>({
    resolver: zodResolver(SCHEMA),
    defaultValues: { name: "", email: "", password: "" },
  });

  async function handleSubmit(values: FormValues) {
    setError(null);
    const res = await createMemberAssistantAction(orgId, teacherId, {
      name: values.name,
      email: values.email.toLowerCase(),
      password: values.password,
    });
    if (!res.ok) {
      setError(res.message);
      return;
    }
    form.reset();
    onCreated();
  }

  return (
    <form
      onSubmit={form.handleSubmit(handleSubmit)}
      className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-gray-50/40 p-4"
      noValidate
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="kintal-aux-name">Nome</Label>
        <Input
          id="kintal-aux-name"
          autoComplete="off"
          autoFocus
          {...form.register("name")}
        />
        {form.formState.errors.name && (
          <p className="text-[11px] text-red-600">
            {form.formState.errors.name.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="kintal-aux-email">Email</Label>
        <Input
          id="kintal-aux-email"
          type="email"
          autoComplete="off"
          {...form.register("email")}
        />
        {form.formState.errors.email && (
          <p className="text-[11px] text-red-600">
            {form.formState.errors.email.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="kintal-aux-pw">Senha</Label>
        <Input
          id="kintal-aux-pw"
          type="text"
          autoComplete="off"
          placeholder="••••••••"
          {...form.register("password")}
        />
        {form.formState.errors.password && (
          <p className="text-[11px] text-red-600">
            {form.formState.errors.password.message}
          </p>
        )}
        <p className="text-[11px] text-gray-500">
          A senha não é enviada por email — entregue pra pessoa manualmente.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
        >
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={form.formState.isSubmitting}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? (
            <>
              <Loader2 className="mr-2 size-3.5 animate-spin" />
              Criando...
            </>
          ) : (
            "Criar auxiliar"
          )}
        </Button>
      </div>
    </form>
  );
}
