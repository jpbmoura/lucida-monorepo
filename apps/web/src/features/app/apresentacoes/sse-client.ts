"use client";

import type { SlideGenerationProgress } from "./types";

// SSE client da geração de deck. Mesma mecânica do wizard de provas
// (fetch + leitura manual do stream, porque é POST com body), mas o evento
// "progress" carrega o slide recém-gerado pra render incremental.

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

export async function postDeckSse<T>(
  url: string,
  init: RequestInit,
  opts?: { onProgress?: (p: SlideGenerationProgress) => void },
): Promise<T> {
  const response = await fetch(url, init);

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/event-stream")) {
    const body = (await response.json().catch(() => null)) as
      | { code?: string; message?: string }
      | null;
    throw new SseHttpError({
      status: response.status,
      code: body?.code ?? "HTTP_ERROR",
      message: body?.message ?? response.statusText ?? "Falha na requisição.",
    });
  }

  if (!response.body) throw new Error("Resposta SSE sem body.");

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;

    let sep = buffer.indexOf("\n\n");
    while (sep !== -1) {
      const rawEvent = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      const parsed = parseSseEvent(rawEvent);
      if (parsed) {
        if (parsed.event === "ping") {
          // ignora heartbeat
        } else if (parsed.event === "progress") {
          opts?.onProgress?.(parsed.data as SlideGenerationProgress);
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
  }
  if (dataLines.length === 0) return null;
  try {
    return { event, data: JSON.parse(dataLines.join("\n")) };
  } catch {
    return null;
  }
}
