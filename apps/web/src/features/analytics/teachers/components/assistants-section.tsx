"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
  createAssistantAction,
  revokeAssistantAction,
  type TeacherAssistantDTO,
} from "../assistants-data";

const SCHEMA = z.object({
  name: z.string().trim().min(1, "Informe o nome."),
  email: z.string().trim().email("Email inválido."),
  password: z.string().min(8, "Mínimo de 8 caracteres."),
});

type FormValues = z.infer<typeof SCHEMA>;

interface Props {
  teacherId: string;
  teacherName: string;
  initialAssistants: TeacherAssistantDTO[];
}

export function AssistantsSection({
  teacherId,
  teacherName,
  initialAssistants,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6">
      <header className="flex items-center justify-between gap-3 pb-4">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-gray-400">
            <ShieldCheck className="size-3.5" />
            Auxiliares
          </div>
          <h2 className="mt-1 text-xl font-medium tracking-tight text-ink">
            Quem pode entrar nesta conta
          </h2>
          <p className="mt-1 max-w-xl text-[13px] text-gray-500">
            Auxiliares logam com email/senha próprios e atuam como{" "}
            <span className="font-medium text-ink">{teacherName}</span>. Tudo
            que fazem fica registrado em nome do professor titular. Sem acesso
            ao Analytics e não podem comprar créditos.
          </p>
        </div>
        <Button
          type="button"
          variant="primary"
          size="md"
          onClick={() => setOpen(true)}
        >
          <Plus className="size-4" />
          Adicionar auxiliar
        </Button>
      </header>

      {initialAssistants.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/40 px-5 py-10 text-center">
          <p className="text-sm font-medium text-ink">
            Nenhum auxiliar cadastrado.
          </p>
          <p className="mt-1 max-w-sm text-[13px] text-gray-500">
            Use o botão acima pra criar uma credencial — você define email e
            senha e entrega manualmente pra pessoa.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {initialAssistants.map((a) => (
            <AssistantRow
              key={a.id}
              teacherId={teacherId}
              assistant={a}
            />
          ))}
        </ul>
      )}

      <CreateAssistantDialog
        open={open}
        onOpenChange={setOpen}
        teacherId={teacherId}
      />
    </section>
  );
}

function AssistantRow({
  teacherId,
  assistant,
}: {
  teacherId: string;
  assistant: TeacherAssistantDTO;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const display = buildDisplayUser({
    name: assistant.assistantName,
    email: assistant.assistantEmail,
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
      const res = await revokeAssistantAction(teacherId, assistant.id);
      if (!res.ok) {
        window.alert(res.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <li className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-ink to-gray-600 text-[12px] font-semibold text-white">
        {display.initials}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-ink">
          {display.name}
        </div>
        <div className="truncate text-[12px] text-gray-500">
          {assistant.assistantEmail}
        </div>
      </div>
      <span className="text-[11px] text-gray-400">
        desde{" "}
        {new Date(assistant.createdAt).toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleRevoke}
        disabled={isPending}
        className={cn("border-red-200 text-red-700 hover:bg-red-50")}
      >
        {isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Trash2 className="size-4" />
        )}
        Revogar
      </Button>
    </li>
  );
}

function CreateAssistantDialog({
  open,
  onOpenChange,
  teacherId,
}: {
  open: boolean;
  onOpenChange(open: boolean): void;
  teacherId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<FormValues>({
    resolver: zodResolver(SCHEMA),
    defaultValues: { name: "", email: "", password: "" },
  });

  async function handleSubmit(values: FormValues) {
    setError(null);
    const res = await createAssistantAction(teacherId, {
      name: values.name,
      email: values.email.toLowerCase(),
      password: values.password,
    });
    if (!res.ok) {
      setError(res.message);
      return;
    }
    onOpenChange(false);
    form.reset();
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo auxiliar</DialogTitle>
          <DialogDescription>
            Define email e senha agora. A senha não é enviada por email — você
            entrega pra pessoa manualmente. Email já entra como verificado.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex flex-col gap-3"
          noValidate
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="aux-name">Nome</Label>
            <Input
              id="aux-name"
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
            <Label htmlFor="aux-email">Email</Label>
            <Input
              id="aux-email"
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
            <Label htmlFor="aux-pw">Senha</Label>
            <Input
              id="aux-pw"
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
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => onOpenChange(false)}
              disabled={form.formState.isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Criando...
                </>
              ) : (
                "Criar auxiliar"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
