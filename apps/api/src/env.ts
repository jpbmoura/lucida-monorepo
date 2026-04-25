import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3333),
  MONGODB_URI: z.string().min(1),

  AUTH_SECRET: z.string().min(32, "AUTH_SECRET precisa ter pelo menos 32 caracteres"),
  AUTH_BASE_URL: z.string().url(),
  WEB_ORIGIN: z.string().url(),

  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),

  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().min(1),
  SMTP_PASS: z.string().min(1),
  EMAIL_FROM: z.string().min(1),

  // Destinatário do formulário de contato em /app/ajuda.
  SUPPORT_EMAIL: z.string().email().default("contato@lucidaexam.com"),

  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL: z.string().min(1).default("gpt-4o-mini"),

  // URL do serviço Python lucida-omr (OMRChecker). Sem isso a feature
  // de scanner fica indisponível — o endpoint devolve 502 via OmrServiceError.
  OMR_SERVICE_URL: z.string().url().optional(),
  OMR_SERVICE_TIMEOUT_MS: z.coerce.number().default(60_000),

  // Créditos concedidos a cada novo usuário no signup. Consome ~25 créditos
  // por prova de 10 questões, então 150 dá ~6 provas pro teste inicial.
  WELCOME_CREDITS: z.coerce.number().int().min(0).default(150),

  // Stripe — todos opcionais. Sem STRIPE_SECRET_KEY, o módulo de assinaturas
  // devolve 503 em qualquer tentativa de checkout/portal, mas o resto da api
  // continua funcionando (welcome credits, gating, etc).
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_BASIC_MONTHLY_PRICE_ID: z.string().optional(),
  STRIPE_BASIC_YEARLY_PRICE_ID: z.string().optional(),
  STRIPE_PRO_MONTHLY_PRICE_ID: z.string().optional(),
  STRIPE_PRO_YEARLY_PRICE_ID: z.string().optional(),

  // Top-ups (pacotes avulsos) — mode=payment no Stripe.
  STRIPE_TOPUP_2K_PRICE_ID: z.string().optional(),
  STRIPE_TOPUP_5K_PRICE_ID: z.string().optional(),
  STRIPE_TOPUP_15K_PRICE_ID: z.string().optional(),

  // Secret do cron que roda POST /v1/internal/expire-credits diariamente.
  // Se não configurado, o endpoint devolve 503 — protege contra calls sem
  // intenção explícita.
  CRON_SECRET: z.string().min(16).optional(),
});

export const env = envSchema.parse(process.env);
