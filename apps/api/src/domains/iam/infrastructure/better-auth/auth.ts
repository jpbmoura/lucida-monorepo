// deviation: thin IAM — BetterAuth é o source-of-truth de identidade.
// Ainda não há domain/application layers; serão adicionados quando surgirem
// regras de negócio além do que o BA já provê (limites de plano por role,
// invariantes de permissão institucional, etc.).

import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { organization } from "better-auth/plugins";
import type { Db } from "mongodb";
import { env } from "@/env.js";
import { sendEmail } from "./send-email.js";
import {
  resetPasswordTemplate,
  verifyEmailTemplate,
  organizationInviteTemplate,
} from "./emails.js";

export type Auth = ReturnType<typeof createAuth>;

export interface AuthHooks {
  /** Disparado após a criação do user no banco. Usado pra welcome credits. */
  onUserCreated?: (userId: string) => Promise<void>;
}

export function createAuth(db: Db, hooks: AuthHooks = {}) {
  return betterAuth({
    database: mongodbAdapter(db),

    secret: env.AUTH_SECRET,
    baseURL: env.AUTH_BASE_URL,
    trustedOrigins: [env.WEB_ORIGIN],

    // Campos extras no documento `user` — todos opcionais. Consumidos pela
    // tela /app/configuracoes e podem alimentar segmentação de prompts + CRM.
    // Arrays são listas de slugs (ver apps/web/.../settings/profile-options.ts).
    //
    // Os três últimos (legacy*, needsEmailUpdate) são metadados da migração do
    // Clerk. Users migrados sem email real ficam com `@legacy.lucida.invalid`
    // e flag needsEmailUpdate=true — precisam de intervenção admin pra logar.
    user: {
      additionalFields: {
        // Role de identidade. Valores conhecidos: "staff" (acesso ao
        // backoffice /kintal). Ausente/null = user comum (professor/
        // instituição). Setado via /kintal/acessos — não há signup
        // público que atribua staff.
        role: { type: "string", required: false },
        // Data em que o role staff foi concedido. Preenchido quando a
        // promoção acontece via /kintal/acessos; pode ficar null em
        // users promovidos manualmente antes deste campo existir.
        staffSince: { type: "date", required: false },

        whatsapp: { type: "string", required: false },
        // CPF (11 dígitos) ou CNPJ (14 dígitos), sem máscara. Persistido só
        // em dígitos pra facilitar comparação; UI aplica máscara.
        // Obrigatório no momento de qualquer checkout (cartão Stripe ou PIX
        // AbacatePay) — AbacatePay exige no `customer.taxId`, e a gente
        // espelha pro Stripe via `customer_data.tax_id_data` por consistência
        // contábil/NFe. Se o user ainda não tem, o front coleta antes do
        // checkout e salva via authClient.updateUser.
        taxId: { type: "string", required: false },
        institutionType: { type: "string", required: false },
        gender: { type: "string", required: false },
        teachingLevels: { type: "string[]", required: false },
        subjects: { type: "string[]", required: false },
        acquisitionChannel: { type: "string", required: false },
        stateUf: { type: "string", required: false },
        studentsRange: { type: "string", required: false },
        teachingYears: { type: "string", required: false },

        legacyClerkId: { type: "string", required: false },
        legacyUsername: { type: "string", required: false },
        needsEmailUpdate: { type: "boolean", required: false },
      },
    },

    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            try {
              await hooks.onUserCreated?.(user.id);
            } catch (err) {
              // Hook não deve bloquear signup — se welcome credits falhar,
              // usuário continua entrando e a gente investiga pelo log.
              console.error(
                "[auth] onUserCreated hook failed for user",
                user.id,
                err,
              );
            }
          },
        },
      },
    },

    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: 8,
      sendResetPassword: async ({ user, url }) => {
        const template = resetPasswordTemplate(url);
        await sendEmail({ to: user.email, ...template });
      },
    },

    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => {
        const template = verifyEmailTemplate(url);
        await sendEmail({ to: user.email, ...template });
      },
    },

    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      },
    },

    plugins: [
      organization({
        async sendInvitationEmail({ email, organization: org, invitation }) {
          const url = `${env.WEB_ORIGIN}/accept-invite?invitation=${invitation.id}`;
          const template = organizationInviteTemplate(org.name, url);
          await sendEmail({ to: email, ...template });
        },
      }),
    ],

    advanced: {
      cookiePrefix: "lucida",
      defaultCookieAttributes: {
        sameSite: "lax",
        secure: env.NODE_ENV === "production",
      },
      // Em produção, quando web e api estiverem em subdomínios distintos
      // (app.lucidaexam.com e api.lucidaexam.com), o cookie precisa ser
      // compartilhado. O rewrite do Next já cobre isso mantendo tudo same-origin,
      // então crossSubDomainCookies fica desligado por padrão.
    },
  });
}
