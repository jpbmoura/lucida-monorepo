// Tuning da geração de questões. Mora num módulo sem dependências de propósito:
// tanto o generator quanto o estimate-credits leem daqui sem criar ciclo de
// import (o generator já importa estimate-credits).

// Tamanho do lote pedido por chamada à OpenAI. Lote pequeno mantém cada
// chamada rápida (longe do timeout de 90s) e o output dentro do teto de
// tokens (sem truncar o JSON da resposta). O loop em
// openai-question-generator chama em lotes até fechar o N pedido.
export const QUESTION_BATCH_SIZE = 10;

// Lotes consecutivos que não trouxeram nada novo antes de ligar o "fill
// mode" — que relaxa a regra de não-redundância pra completar N quando o
// material é raso demais pra N questões distintas.
export const FILL_MODE_STALE_LIMIT = 2;
