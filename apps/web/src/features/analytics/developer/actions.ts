"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import type {
  ApiKeyDTO,
  ApiKeyEnvironment,
  ApiKeyScope,
  WebhookEndpointDTO,
  WebhookEvent,
} from "./data";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

async function forward(
  path: string,
  init: Omit<RequestInit, "headers" | "body"> & { body?: unknown } = {},
): Promise<Response> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  return fetch(`${API_URL}${path}`, {
    method: init.method ?? "GET",
    headers: {
      "content-type": "application/json",
      cookie: cookieHeader,
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
}

async function parseError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string };
    return body.message ?? "Algo deu errado.";
  } catch {
    return "Algo deu errado.";
  }
}

export async function createApiKeyAction(input: {
  name: string;
  environment: ApiKeyEnvironment;
  scopes: ApiKeyScope[];
}): Promise<
  ActionResult<{
    plaintext: string;
    key: ApiKeyDTO;
  }>
> {
  let res: Response;
  try {
    res = await forward("/v1/analytics/developer/api-keys", {
      method: "POST",
      body: input,
    });
  } catch {
    return { ok: false, error: "Falha de conexão com a API." };
  }
  if (!res.ok) {
    return { ok: false, error: await parseError(res) };
  }
  // `plaintext` volta aqui pra componente cliente mostrar no dialog de
  // reveal-once. Após o dialog fechar, o valor não pode ser recuperado.
  const body = (await res.json()) as {
    data: {
      plaintext: string;
      key: {
        id: string;
        name: string;
        environment: ApiKeyEnvironment;
        scopes: ApiKeyScope[];
        keyLastFour: string;
        createdAt: string;
      };
    };
  };
  revalidatePath("/analytics/desenvolvedores");
  return {
    ok: true,
    data: {
      plaintext: body.data.plaintext,
      key: {
        ...body.data.key,
        lastUsedAt: null,
        revokedAt: null,
      },
    },
  };
}

export async function revokeApiKeyAction(
  keyId: string,
): Promise<ActionResult> {
  let res: Response;
  try {
    res = await forward(
      `/v1/analytics/developer/api-keys/${encodeURIComponent(keyId)}`,
      { method: "DELETE" },
    );
  } catch {
    return { ok: false, error: "Falha de conexão com a API." };
  }
  if (!res.ok) {
    return { ok: false, error: await parseError(res) };
  }
  revalidatePath("/analytics/desenvolvedores");
  return { ok: true, data: undefined };
}

export async function createWebhookEndpointAction(input: {
  url: string;
  environment: ApiKeyEnvironment;
  events: WebhookEvent[];
}): Promise<
  ActionResult<{
    signingSecret: string;
    endpoint: WebhookEndpointDTO;
  }>
> {
  let res: Response;
  try {
    res = await forward("/v1/analytics/developer/webhook-endpoints", {
      method: "POST",
      body: input,
    });
  } catch {
    return { ok: false, error: "Falha de conexão com a API." };
  }
  if (!res.ok) {
    return { ok: false, error: await parseError(res) };
  }
  const body = (await res.json()) as {
    data: {
      signingSecret: string;
      endpoint: {
        id: string;
        url: string;
        environment: ApiKeyEnvironment;
        events: WebhookEvent[];
        enabled: boolean;
        createdAt: string;
      };
    };
  };
  revalidatePath("/analytics/desenvolvedores");
  return {
    ok: true,
    data: {
      signingSecret: body.data.signingSecret,
      endpoint: {
        ...body.data.endpoint,
        updatedAt: body.data.endpoint.createdAt,
      },
    },
  };
}

export async function updateWebhookEndpointAction(
  endpointId: string,
  input: {
    url?: string;
    events?: WebhookEvent[];
    enabled?: boolean;
  },
): Promise<ActionResult> {
  let res: Response;
  try {
    res = await forward(
      `/v1/analytics/developer/webhook-endpoints/${encodeURIComponent(endpointId)}`,
      { method: "PATCH", body: input },
    );
  } catch {
    return { ok: false, error: "Falha de conexão com a API." };
  }
  if (!res.ok) {
    return { ok: false, error: await parseError(res) };
  }
  revalidatePath("/analytics/desenvolvedores");
  return { ok: true, data: undefined };
}

export async function rotateWebhookSecretAction(
  endpointId: string,
): Promise<ActionResult<{ signingSecret: string }>> {
  let res: Response;
  try {
    res = await forward(
      `/v1/analytics/developer/webhook-endpoints/${encodeURIComponent(endpointId)}/rotate-secret`,
      { method: "POST" },
    );
  } catch {
    return { ok: false, error: "Falha de conexão com a API." };
  }
  if (!res.ok) {
    return { ok: false, error: await parseError(res) };
  }
  const body = (await res.json()) as { data: { signingSecret: string } };
  revalidatePath("/analytics/desenvolvedores");
  return { ok: true, data: body.data };
}

export async function deleteWebhookEndpointAction(
  endpointId: string,
): Promise<ActionResult> {
  let res: Response;
  try {
    res = await forward(
      `/v1/analytics/developer/webhook-endpoints/${encodeURIComponent(endpointId)}`,
      { method: "DELETE" },
    );
  } catch {
    return { ok: false, error: "Falha de conexão com a API." };
  }
  if (!res.ok) {
    return { ok: false, error: await parseError(res) };
  }
  revalidatePath("/analytics/desenvolvedores");
  return { ok: true, data: undefined };
}
