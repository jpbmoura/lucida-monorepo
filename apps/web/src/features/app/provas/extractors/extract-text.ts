"use client";

export interface ExtractResult {
  text: string;
  warning?: string;
}

export class ExtractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExtractError";
  }
}

export async function extractTextFromFile(
  file: File,
  // Progresso por página (só PDF chama). Deixa a UI mostrar "página X/Y" em
  // PDF longo, que antes parecia travado.
  onProgress?: (done: number, total: number) => void,
): Promise<ExtractResult> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf" || file.type === "application/pdf") {
    return extractPdf(file, onProgress);
  }
  if (
    ext === "docx" ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return extractDocx(file);
  }
  if (ext === "txt" || ext === "md" || file.type.startsWith("text/")) {
    return extractPlainText(file);
  }
  throw new ExtractError(
    `Tipo não suportado: .${ext || "?"} (apenas PDF, DOCX, TXT, MD)`,
  );
}

async function extractPlainText(file: File): Promise<ExtractResult> {
  return { text: (await file.text()).trim() };
}

async function extractDocx(file: File): Promise<ExtractResult> {
  const mammoth = await import("mammoth");
  const arrayBuffer = await file.arrayBuffer();
  try {
    const result = await mammoth.extractRawText({ arrayBuffer });
    const text = result.value.trim();
    if (!text) {
      throw new ExtractError("Documento DOCX veio vazio.");
    }
    return { text };
  } catch (err) {
    if (err instanceof ExtractError) throw err;
    throw new ExtractError(
      `Falha ao ler DOCX: ${(err as Error).message ?? "erro desconhecido"}`,
    );
  }
}

let pdfWorkerReady = false;

// pdfjs precisa de um Worker pra parsear sem travar a thread principal.
// O padrão `new Worker(new URL(..., import.meta.url))` é reconhecido pelo
// webpack/turbopack do Next 15 como "empacote esse arquivo e me dê a URL".
// Sem worker o getDocument() funciona mas a UI congela em PDFs grandes.
async function ensurePdfWorker(
  pdfjs: typeof import("pdfjs-dist"),
): Promise<void> {
  if (pdfWorkerReady) return;
  if (!pdfjs.GlobalWorkerOptions.workerPort) {
    const worker = new Worker(
      new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url),
      { type: "module" },
    );
    pdfjs.GlobalWorkerOptions.workerPort = worker;
  }
  pdfWorkerReady = true;
}

async function extractPdf(
  file: File,
  onProgress?: (done: number, total: number) => void,
): Promise<ExtractResult> {
  const pdfjs = await import("pdfjs-dist");
  await ensurePdfWorker(pdfjs);

  const data = new Uint8Array(await file.arrayBuffer());
  let doc;
  try {
    doc = await pdfjs.getDocument({ data }).promise;
  } catch (err) {
    const e = err as { name?: string; message?: string };
    if (e.name === "PasswordException") {
      throw new ExtractError(`PDF protegido por senha: ${file.name}`);
    }
    throw new ExtractError(
      `Falha ao abrir PDF: ${e.message ?? "erro desconhecido"}`,
    );
  }

  try {
    onProgress?.(0, doc.numPages);
    const pages: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      // Página problemática (fonte exótica, conteúdo corrompido) não derruba
      // o arquivo inteiro — pula e segue. PDF longo "buga" menos assim.
      try {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        // PDFs com layout (colunas, espaçamento absoluto) vêm como itens soltos.
        // Concatenar com espaço cobre 90% dos casos; o resto a IA tolera.
        const pageText = content.items
          .map((item) => ("str" in item ? item.str : ""))
          .filter(Boolean)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
        if (pageText) pages.push(pageText);
        page.cleanup();
      } catch {
        // ignora a página e continua
      }
      onProgress?.(i, doc.numPages);
    }
    const text = pages.join("\n\n").trim();
    if (!text) {
      // PDF "imagem" (escaneado sem OCR) chega aqui — sem text layer extraível.
      throw new ExtractError(
        `PDF sem texto extraível (provavelmente escaneado/imagem): ${file.name}`,
      );
    }
    return {
      text,
      warning:
        doc.numPages > 50
          ? `PDF longo (${doc.numPages} páginas) — material pode estar cortado por limite de tokens.`
          : undefined,
    };
  } finally {
    await doc.cleanup();
    await doc.destroy();
  }
}
