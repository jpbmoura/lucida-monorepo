"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { formatTaxId, isValidTaxId, normalizeTaxId } from "@/lib/tax-id";

interface Props {
  open: boolean;
  onOpenChange(open: boolean): void;
  /**
   * Disparado depois que o user salva um taxId válido. Recebe o valor
   * normalizado (só dígitos) — o caller usa pra continuar com o checkout
   * que estava represado.
   */
  onSaved(taxId: string): void;
}

/**
 * Modal compartilhado de coleta de CPF/CNPJ. Mostrado quando o user clica
 * em qualquer fluxo de pagamento (cartão Stripe ou PIX AbacatePay) sem
 * ter taxId no perfil. Salva via BetterAuth `updateUser` — o campo está
 * em `additionalFields` (ver `apps/api/src/domains/iam/.../auth.ts`).
 */
export function TaxIdPromptDialog({ open, onOpenChange, onSaved }: Props) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const normalized = normalizeTaxId(value);
    if (!isValidTaxId(normalized)) {
      setError("Digite um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.");
      return;
    }
    setSaving(true);
    try {
      // additionalFields do BetterAuth não viajam pelo tipo do client —
      // por isso o cast pra `Record<string, unknown>`. Mesmo padrão usado
      // em features/app/settings/components/profile-form.tsx.
      const res = await authClient.updateUser({
        taxId: normalized,
      } as unknown as Record<string, unknown>);
      if (res.error) {
        setError(res.error.message ?? "Não foi possível salvar.");
        return;
      }
      onSaved(normalized);
      onOpenChange(false);
      setValue("");
    } catch (err) {
      setError((err as Error).message ?? "Erro inesperado ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Antes de pagar</DialogTitle>
          <DialogDescription>
            Precisamos do seu CPF ou CNPJ pra emitir o pagamento — vale tanto
            pra cartão quanto pra PIX. Salvamos no seu perfil pra você não
            precisar digitar de novo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tax-id-input">CPF ou CNPJ</Label>
            <Input
              id="tax-id-input"
              autoFocus
              inputMode="numeric"
              autoComplete="off"
              placeholder="000.000.000-00"
              value={value}
              onChange={(e) => {
                setError(null);
                setValue(formatTaxId(e.target.value));
              }}
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="md" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar e continuar"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
