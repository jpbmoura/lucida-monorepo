/**
 * Ambiente de uma API key. `"live"` são chaves de produção — consomem
 * créditos reais da wallet institucional e disparam webhooks pra endpoints
 * `live`. `"test"` são chaves de sandbox: nunca debitam créditos da org e
 * webhooks são roteados pra endpoints `test` (ou ficam em log).
 *
 * Os dois tipos coexistem no mesmo banco (não há collection separada) — a
 * diferença é comportamental, não topológica. Rotas públicas (Fase B) vão
 * ler esse campo pra decidir se cobram/disparam.
 */
export type ApiKeyEnvironment = "live" | "test";
