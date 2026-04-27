import { CodeBlock } from "./code-block";

interface EndpointSidekickProps {
  /** Linguagem do bloco de request (default "curl"). */
  requestLanguage?: string;
  request: string;
  responseSuccess: {
    status: number;
    description?: string;
    body: string;
  };
  /**
   * Bodies de erro de exemplo, opcionais. Exibidos abaixo do response
   * de sucesso, cada um com seu próprio header de status. Permite
   * mostrar pra o leitor o JSON exato que ele vai receber em cada caso
   * (não só o code/message — o shape completo).
   */
  errorExamples?: Array<{
    status: number;
    code: string;
    body: string;
  }>;
}

/**
 * Painel lateral fixo das pages de endpoint — request em cima, response
 * embaixo, sempre os dois visíveis (sem aba). `sticky top-6` cola no
 * topo enquanto o user rola a descrição. Em viewports < xl, esse painel
 * desce pro fluxo do conteúdo (controlado pelo grid em EndpointPage).
 *
 * Cada bloco tem header próprio com label do tipo (REQUEST / RESPONSE)
 * + status no caso de response. O `CodeBlock` cuida do highlight e do
 * botão de copiar.
 */
export function EndpointSidekick({
  requestLanguage = "curl",
  request,
  responseSuccess,
  errorExamples,
}: EndpointSidekickProps) {
  return (
    <aside className="flex flex-col gap-4 xl:sticky xl:top-6 xl:max-h-[calc(100vh-3rem)] xl:overflow-y-auto xl:pr-1 [scrollbar-width:thin]">
      <SidekickBlock label="Request" sublabel={requestLanguage}>
        <CodeBlock code={request} language={requestLanguage} />
      </SidekickBlock>

      <SidekickBlock
        label="Response"
        sublabel={`${responseSuccess.status} · ${responseSuccess.description ?? "OK"}`}
        statusTone="success"
      >
        <CodeBlock code={responseSuccess.body} language="json" />
      </SidekickBlock>

      {errorExamples?.map((err) => (
        <SidekickBlock
          key={`${err.status}-${err.code}`}
          label="Erro"
          sublabel={`${err.status} · ${err.code}`}
          statusTone="error"
        >
          <CodeBlock code={err.body} language="json" />
        </SidekickBlock>
      ))}
    </aside>
  );
}

function SidekickBlock({
  label,
  sublabel,
  statusTone,
  children,
}: {
  label: string;
  sublabel?: string;
  statusTone?: "success" | "error";
  children: React.ReactNode;
}) {
  const sublabelColor =
    statusTone === "success"
      ? "text-emerald-600"
      : statusTone === "error"
        ? "text-rose-600"
        : "text-gray-500";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-gray-500">
          {label}
        </span>
        {sublabel && (
          <span className={`font-mono text-[11px] ${sublabelColor}`}>
            {sublabel}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
