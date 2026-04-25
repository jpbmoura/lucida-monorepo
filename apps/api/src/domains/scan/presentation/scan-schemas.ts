import { z } from "zod";

// Folha vem como data URL ou base64 cru; aceitamos os dois e deixamos o
// client chamante se virar pra mandar <2MB de payload.
export const scanSheetBody = z.object({
  imageBase64: z
    .string()
    .min(100, "imageBase64 parece vazio.")
    .max(10_000_000, "Imagem muito grande (> ~7MB base64)."),
});

export const examIdParam = z.object({ id: z.string().min(1) });
export const scanIdParam = z.object({ id: z.string().min(1) });
