"use client";

interface SseErrorShape {
  status: number;
  code: string;
  message: string;
}

export class SseHttpError extends Error {
  status: number;
  code: string;
  constructor(payload: SseErrorShape) {
    super(payload.message);
    this.status = payload.status;
    this.code = payload.code;
    this.name = "SseHttpError";
  }
}

/**
 * Faz POST esperando uma resposta SSE com **um** evento `result` final.
 *
 * Por que não EventSource: EventSource só faz GET e não permite enviar body.
 * A geração de prova precisa de POST com config no body, então usamos
 * fetch + leitura manual do stream.
 *
 * Eventos esperados do servidor:
 *  - `event: ping`   — heartbeat, mantém conexão viva (ignorado aqui)
 *  - `event: result` — `{ data: <T> }` final, resolve a Promise
 *  - `event: error`  — `{ status, code, message }`, rejeita com `SseHttpError`
 *
 * Se a request **não** virar SSE (ex.: validação de payload retornou 4xx
 * com JSON normal), tratamos como erro HTTP convencional pra o caller
 * mostrar a mensagem do `code/message`.
 */
export async function postSseExpectingResult<T>(
  url: string,
  init: RequestInit,
): Promise<T> {
  const response = await fetch(url, init);

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/event-stream")) {
    // Resposta convencional (JSON 4xx ou erro inesperado). Repassa erro
    // estruturado quando possível pra UI manter os branches por code.
    const body = (await response.json().catch(() => null)) as
      | { code?: string; message?: string }
      | null;
    throw new SseHttpError({
      status: response.status,
      code: body?.code ?? "HTTP_ERROR",
      message: body?.message ?? response.statusText ?? "Falha na requisição.",
    });
  }

  if (!response.body) {
    throw new Error("Resposta SSE sem body.");
  }

  const reader = response.body
    .pipeThrough(new TextDecoderStream())
    .getReader();

  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;

    // SSE separa eventos por linha em branco. Processa todos os
    // completos do buffer; deixa o resto pro próximo chunk.
    let sep = buffer.indexOf("\n\n");
    while (sep !== -1) {
      const rawEvent = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      const parsed = parseSseEvent(rawEvent);
      if (parsed) {
        if (parsed.event === "ping") {
          // ignora
        } else if (parsed.event === "error") {
          await reader.cancel();
          throw new SseHttpError(parsed.data as SseErrorShape);
        } else if (parsed.event === "result") {
          await reader.cancel();
          return (parsed.data as { data: T }).data;
        }
      }
      sep = buffer.indexOf("\n\n");
    }
  }

  throw new Error("Stream SSE encerrou sem evento 'result'.");
}

function parseSseEvent(raw: string): { event: string; data: unknown } | null {
  let event = "message";
  const dataLines: string[] = [];
  for (const line of raw.split("\n")) {
    if (line.startsWith("event:")) {
      event = line.slice("event:".length).trim();
    } else if (line.startsWith("data:")) {
      dataLines.push(line.slice("data:".length).trim());
    }
    // ignora linhas em branco e comentários (`:` no início)
  }
  if (dataLines.length === 0) return null;
  try {
    return { event, data: JSON.parse(dataLines.join("\n")) };
  } catch {
    return null;
  }
}
