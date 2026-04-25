import { z } from "zod";

export const kintalSignInSchema = z.object({
  email: z.string().email("E-mail inválido."),
  password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres."),
});

export type KintalSignInInput = z.infer<typeof kintalSignInSchema>;
