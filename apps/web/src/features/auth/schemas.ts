import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().email("E-mail inválido."),
  password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres."),
});

export type SignInInput = z.infer<typeof signInSchema>;

export const signUpSchema = z.object({
  name: z.string().min(2, "Informe seu nome."),
  email: z.string().email("E-mail inválido."),
  password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres."),
});

export type SignUpInput = z.infer<typeof signUpSchema>;

// Reset de senha — fluxo "esqueci a senha" via email.
export const forgotPasswordSchema = z.object({
  email: z.string().email("E-mail inválido."),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres."),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "As senhas não conferem.",
    path: ["confirmPassword"],
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// Magic link — sign-in passwordless por email.
export const magicLinkSchema = z.object({
  email: z.string().email("E-mail inválido."),
});
export type MagicLinkInput = z.infer<typeof magicLinkSchema>;

// Mudança de senha (user logado, já tem credential).
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Informe a senha atual."),
    newPassword: z
      .string()
      .min(8, "A nova senha precisa ter pelo menos 8 caracteres."),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "As senhas não conferem.",
    path: ["confirmPassword"],
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// Definição inicial de senha (user logado, ainda sem credential — entrou só por Google).
export const setPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, "A senha precisa ter pelo menos 8 caracteres."),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "As senhas não conferem.",
    path: ["confirmPassword"],
  });
export type SetPasswordInput = z.infer<typeof setPasswordSchema>;
