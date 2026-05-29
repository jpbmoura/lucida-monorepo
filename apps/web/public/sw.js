// Service worker mínimo da Lucida.
//
// Objetivo único: tornar o app instalável (PWA) — os navegadores exigem um SW
// registrado com handler de `fetch`. NÃO faz cache offline agressivo de
// propósito: a Lucida é majoritariamente dados em tempo real (saldo, provas,
// submissões) e cachear isso causaria UI desatualizada. Estratégia: passa
// direto pra rede (network-only). Caching offline pode vir depois via Serwist.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Network-only: deixa o request seguir pro handler default do navegador.
  // O handler precisa existir pra instalabilidade, mas não interceptamos nada.
});
