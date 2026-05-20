import { DomainError } from "@/shared/errors/domain-error.js";

export class UnsupportedFileTypeError extends DomainError {
  readonly code = "AI_UNSUPPORTED_FILE";
  readonly statusCode = 415;
  constructor(reason: string) {
    super(reason);
  }
}

export class FileExtractionFailedError extends DomainError {
  readonly code = "AI_EXTRACTION_FAILED";
  readonly statusCode = 422;
  constructor(reason: string) {
    super(reason);
  }
}

export class EmptySourceMaterialError extends DomainError {
  readonly code = "AI_EMPTY_SOURCE";
  readonly statusCode = 400;
  constructor() {
    super("Envie ao menos um arquivo ou texto com conteúdo.");
  }
}

// R8 — material extraído existe mas é pequeno/ruído demais pra gerar prova
// decente (caso típico: PDF escaneado sem camada de texto). Distinto do
// EmptySourceMaterialError (zero conteúdo) pra dar uma mensagem acionável.
export class InsufficientSourceMaterialError extends DomainError {
  readonly code = "AI_INSUFFICIENT_SOURCE";
  readonly statusCode = 422;
  constructor(reason: string) {
    super(reason);
  }
}

export class AiGenerationFailedError extends DomainError {
  readonly code = "AI_GENERATION_FAILED";
  readonly statusCode = 502;
  constructor(reason: string) {
    super(reason);
  }
}
