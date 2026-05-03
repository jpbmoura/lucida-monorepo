"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2, Search } from "lucide-react";
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
import { cn } from "@/lib/utils";
import {
  fetchInstitutionsForPicker,
  linkUserToInstitutionAction,
} from "@/features/kintal/institutions/data";
import type { InstitutionRole } from "@/features/kintal/institutions/types";

interface OrgOption {
  id: string;
  name: string;
  slug: string | null;
}

interface Props {
  userId: string;
  open: boolean;
  onOpenChange(open: boolean): void;
}

export function LinkInstitutionDialog({ userId, open, onOpenChange }: Props) {
  const router = useRouter();
  const [orgs, setOrgs] = useState<OrgOption[] | null>(null);
  const [search, setSearch] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [role, setRole] = useState<InstitutionRole>("member");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setOrgs(null);
    setError(null);
    fetchInstitutionsForPicker()
      .then((res) => {
        if (!cancelled) setOrgs(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message ?? "Falha ao carregar orgs.");
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const filtered = useMemo(() => {
    if (!orgs) return [];
    const q = search.trim().toLowerCase();
    if (!q) return orgs;
    return orgs.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        (o.slug?.toLowerCase().includes(q) ?? false),
    );
  }, [orgs, search]);

  async function handleSubmit() {
    if (!selectedOrgId) return;
    setError(null);
    setSubmitting(true);
    const res = await linkUserToInstitutionAction(userId, {
      organizationId: selectedOrgId,
      role,
    });
    setSubmitting(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    onOpenChange(false);
    setSelectedOrgId(null);
    setRole("member");
    setSearch("");
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setError(null);
          setSelectedOrgId(null);
          setSearch("");
        }
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Vincular a uma instituição</DialogTitle>
          <DialogDescription>
            Adiciona o usuário direto à instituição escolhida, sem envio de
            convite. Usuário só pode pertencer a uma instituição por vez.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Instituição</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Buscar pelo nome ou slug..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="mt-1 max-h-56 overflow-y-auto rounded-xl border border-gray-100 bg-gray-50/50">
              {orgs === null ? (
                <div className="flex items-center justify-center py-6 text-xs text-gray-400">
                  <Loader2 className="mr-2 size-3.5 animate-spin" />
                  Carregando...
                </div>
              ) : filtered.length === 0 ? (
                <p className="px-4 py-6 text-center text-xs text-gray-500">
                  Nenhuma instituição encontrada.
                </p>
              ) : (
                <ul className="flex flex-col">
                  {filtered.map((o) => {
                    const selected = selectedOrgId === o.id;
                    return (
                      <li key={o.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedOrgId(o.id)}
                          className={cn(
                            "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors",
                            selected
                              ? "bg-brand-primary/5"
                              : "hover:bg-gray-100/70",
                          )}
                        >
                          <span
                            className={cn(
                              "grid size-7 shrink-0 place-items-center rounded-md",
                              selected
                                ? "bg-brand-primary/10 text-brand-primary"
                                : "bg-gray-200 text-gray-500",
                            )}
                          >
                            <Building2 className="size-3.5" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium text-ink">
                              {o.name}
                            </div>
                            {o.slug && (
                              <div className="truncate text-[11px] text-gray-500">
                                {o.slug}
                              </div>
                            )}
                          </div>
                          {selected && (
                            <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-brand-primary">
                              Selecionada
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          <fieldset className="flex flex-col gap-2">
            <Label>Função</Label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { value: "member", label: "Professor" },
                  { value: "admin", label: "Administrador" },
                ] as const
              ).map((opt) => {
                const selected = role === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRole(opt.value)}
                    className={cn(
                      "rounded-xl border px-3 py-2.5 text-left transition-colors",
                      selected
                        ? "border-brand-primary bg-brand-primary/5"
                        : "border-gray-100 bg-white hover:border-gray-200",
                    )}
                  >
                    <div className="text-sm font-medium text-ink">
                      {opt.label}
                    </div>
                  </button>
                );
              })}
            </div>
          </fieldset>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleSubmit}
            disabled={submitting || !selectedOrgId}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Vinculando...
              </>
            ) : (
              "Vincular"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
