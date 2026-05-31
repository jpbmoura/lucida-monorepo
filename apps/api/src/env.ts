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

  // Resend (transacional). API HTTP em vez de SMTP — porta 443 sempre passa
  // em cloud egress. Substitui Hostinger SMTP que tinha problema de
  // entrega + risco de bloqueio. `EMAIL_FROM` precisa estar num domínio
  // verificado no painel Resend (SPF + DKIM no DNS).
  RESEND_API_KEY: z.string().min(1),
  EMAIL_FROM: z.string().min(1),

  // Destinatário do formulário de contato em /app/ajuda.
  SUPPORT_EMAIL: z.string().email().default("contato@lucidaexam.com"),

  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL: z.string().min(1).default("gpt-4.1-mini"),

  // Pexels — busca de imagens de stock pros slides (módulo Apresentações).
  // Opcional: sem a key, o ImageProvider devolve [] e os slides caem pra
  // tipografia/tema (degradação graciosa). Default 200 req/h, 20k/mês.
  PEXELS_API_KEY: z.string().optional(),

  // URL do serviço Python lucida-omr (OMRChecker). Sem isso a feature
  // de scanner fica indisponível — o endpoint devolve 502 via OmrServiceError.
  OMR_SERVICE_URL: z.string().url().optional(),
  OMR_SERVICE_TIMEOUT_MS: z.coerce.number().default(60_000),

  // Créditos concedidos a cada novo usuário no signup. Consome ~700 créditos
  // por prova contextual de 10 questões, então 2.000 dá ~3 provas pro teste
  // inicial — espaço pra avaliar a ferramenta antes de pagar.
  WELCOME_CREDITS: z.coerce.number().int().min(0).default(2000),

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

  // AbacatePay — PIX para top-ups. Stripe segue como provedor de cartão;
  // AbacatePay entra só no caminho PIX porque o Stripe não libera PIX pra
  // nossa conta. Sem ABACATEPAY_API_KEY a rota POST /v1/billing/topup/pix
  // devolve 503 — igual ao gating do Stripe.
  ABACATEPAY_API_KEY: z.string().optional(),
  // Secret enviado como query param ?webhookSecret=... pelo painel da
  // AbacatePay. É o único mecanismo de verificação documentado em v2.
  ABACATEPAY_WEBHOOK_SECRET: z.string().min(16).optional(),

  // Secret do cron que roda POST /v1/internal/expire-credits diariamente.
  // Se não configurado, o endpoint devolve 503 — protege contra calls sem
  // intenção explícita.
  CRON_SECRET: z.string().min(16).optional(),

  // Tickets / Atendimento — endereço from das respostas (e usado pro plus
  // addressing no Reply-To). Formato: `Lucida <contato@lucidaexam.com>`.
  // O local part (antes do @) é extraído pra montar `contato+t_{id}@`.
  TICKETS_FROM_EMAIL: z.string().min(1).optional(),
  // Secret HMAC do webhook Resend Inbound (formato `whsec_<base64>`).
  // Sem isso, a rota POST /v1/tickets/inbound devolve 503 — não dá pra
  // confiar em payload não-assinado.
  TICKETS_INBOUND_SECRET: z.string().min(16).optional(),

  // NFE.io — emissão de NFS-e quando há transação financeira (Stripe sub,
  // Stripe topup, PIX AbacatePay). Sem NFEIO_API_KEY o módulo de invoicing
  // fica offline: pagamentos seguem sendo processados normalmente, só não
  // geram nota automática. Mesmo padrão de Stripe/AbacatePay.
  NFEIO_API_KEY: z.string().optional(),
  // Base URL — sandbox como default pra evitar emitir nota em produção sem
  // intenção. Trocar pra https://api.nfe.io em produção.
  NFEIO_BASE_URL: z.string().url().default("https://api.sandbox.nfe.io"),
  // ID da Company da Lucida no NFE.io. A Company é criada no painel deles
  // (CNPJ + endereço + certificado A1 + credenciais da prefeitura). Sem o
  // ID, mesmo com API key não há pra onde emitir.
  NFEIO_COMPANY_ID: z.string().optional(),
  // Secret HMAC pra verificar webhooks de status (Issued/Cancelled/Error).
  // Sem isso, a rota POST /v1/invoicing/webhook devolve 503 — não dá pra
  // confiar em webhook não-assinado.
  NFEIO_WEBHOOK_HMAC_SECRET: z.string().min(16).optional(),
});

export const env = envSchema.parse(process.env);
