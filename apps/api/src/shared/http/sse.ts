import type { Response } from "express";

export interface SseStream {
  send: (event: string, data: unknown) => void;
  end: () => void;
  isClosed: () => boolean;
}

/**
 * Inicia uma resposta Server-Sent Events.
 *
 * Por que SSE aqui: a rota `/v1/ai/generate-exam` fica silenciosa por
 * 30–120s esperando a OpenAI responder, e o edge proxy (Fastly em GRU,
 * provisionado pela Railway) corta a conexão por inatividade — o cliente
 * recebe ECONNRESET sem nunca ver a resposta. Com SSE a gente:
 *
 * 1. Manda os headers IMEDIATAMENTE (`flushHeaders`), zerando o
 *    `first_byte_timeout` do Fastly logo no início.
 * 2. Manda heartbeats periódicos (caller decide o intervalo), mantendo
 *    bytes fluindo dentro do `between_bytes_timeout`.
 * 3. Quando o resultado real fica pronto, manda como `event: result` e
 *    fecha o stream.
 *
 * O `X-Accel-Buffering: no` é hint pro nginx/reverse proxies não buffarem
 * a resposta — Fastly não usa esse header mas não atrapalha. Cache-Control
 * `no-transform` evita que CDNs comprimam/transformem o stream.
 */
export function startSseStream(res: Response): SseStream {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();

  let closed = false;
  res.on("close", () => {
    closed = true;
  });

  return {
    send(event, data) {
      if (closed) return;
      // SSE: cada evento é "event: <name>\ndata: <payload>\n\n".
      // JSON.stringify nunca produz quebra de linha literal, então uma
      // linha de `data:` cobre qualquer payload JSON.
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    },
    end() {
      if (closed) return;
      closed = true;
      res.end();
    },
    isClosed: () => closed,
  };
}
