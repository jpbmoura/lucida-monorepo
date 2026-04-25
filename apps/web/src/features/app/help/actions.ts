"use server";

import { cookies } from "next/headers";
import { z } from "zod";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

// Categorias compartilhadas com o backend (support-controller.ts). As 5
// primeiras aparecem no /app/ajuda; as 3 últimas no /analytics/ajuda
// (contexto institucional). O mesmo server action atende os dois formulários
// — o `referer` no email revela a origem pra quem responde.
export const CONTACT_CATEGORIES = [
  "duvida",
  "problema",
  "sugestao",
  "billing",
  "outro",
  "duvida_admin",
  "billing_institucional",
  "gestao_professores",
] as const;

export type ContactCategory = (typeof CONTACT_CATEGORIES)[number];

const contactSchema = z.object({
  category: z.enum(CONTACT_CATEGORIES),
  subject: z.string().trim().min(3).max(160),
  message: z.string().trim().min(10).max(4000),
});

export type ContactFormInput = z.infer<typeof contactSchema>;

export interface ContactFormResult {
  ok: boolean;
  error?: string;
}

export async function sendContactMessageAction(
  input: ContactFormInput,
): Promise<ContactFormResult> {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Preencha os campos corretamente." };
  }

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  try {
    const res = await fetch(`${API_URL}/v1/support/contact`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: cookieHeader,
      },
      body: JSON.stringify(parsed.data),
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.text();
      try {
        const parsed = JSON.parse(body) as { message?: string };
        return {
          ok: false,
          error: parsed.message ?? "Não conseguimos enviar sua mensagem.",
        };
      } catch {
        return { ok: false, error: "Não conseguimos enviar sua mensagem." };
      }
    }

    return { ok: true };
  } catch {
    return {
      ok: false,
      error:
        "Falha de conexão ao enviar. Tente novamente em instantes ou use o WhatsApp.",
    };
  }
}
