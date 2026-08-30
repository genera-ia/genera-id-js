import { GeneraIdError } from "./errors.js";

export interface HttpOptions {
  apiKey: string;
  baseUrl: string;
  /** Tentativas extras em 429/5xx/erro de rede (padrão 2; 0 desliga). */
  maxRetries: number;
  fetch: typeof globalThis.fetch;
}

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryAfterMs(response: Response, attempt: number): number {
  const header = response.headers.get("Retry-After");
  const seconds = header === null ? Number.NaN : Number(header);
  if (Number.isFinite(seconds) && seconds >= 0 && seconds <= 60) {
    return seconds * 1000;
  }
  return 250 * 2 ** attempt;
}

export async function request<T>(
  options: HttpOptions,
  method: string,
  path: string,
  body?: unknown,
  query?: Record<string, string | number | undefined>,
): Promise<T> {
  const url = new URL(options.baseUrl.replace(/\/+$/, "") + path);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }

  const init: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  };

  let lastError: unknown;
  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    let response: Response;
    try {
      response = await options.fetch(url, init);
    } catch (networkError) {
      lastError = networkError;
      if (attempt < options.maxRetries) {
        await delay(250 * 2 ** attempt);
        continue;
      }
      throw new GeneraIdError(`Falha de rede ao chamar ${method} ${path}.`, 0, lastError);
    }

    if (RETRYABLE_STATUS.has(response.status) && attempt < options.maxRetries) {
      await delay(retryAfterMs(response, attempt));
      continue;
    }

    if (!response.ok) {
      let responseBody: unknown;
      const text = await response.text();
      try {
        responseBody = JSON.parse(text);
      } catch {
        responseBody = text;
      }
      throw new GeneraIdError(
        `${method} ${path} respondeu ${response.status}.`,
        response.status,
        responseBody,
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  // Inalcançável: o laço sempre retorna ou lança.
  throw new GeneraIdError(`Falha ao chamar ${method} ${path}.`, 0, lastError);
}
