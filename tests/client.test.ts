import { afterEach, describe, expect, it, vi } from "vitest";
import { GeneraId, GeneraIdError } from "../src/index.js";

function jsonResponse(status: number, body: unknown, headers?: Record<string, string>): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

function fetchMockOf(handler: (...args: Parameters<typeof fetch>) => Promise<Response>) {
  return vi.fn(handler);
}

function makeClient(fetchMock: typeof fetch, maxRetries = 0): GeneraId {
  return new GeneraId({
    apiKey: "gid_sk_teste",
    baseUrl: "https://id.example.com/",
    fetch: fetchMock,
    maxRetries,
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GeneraId", () => {
  it("exige apiKey e baseUrl", () => {
    expect(() => new GeneraId({ apiKey: "", baseUrl: "x" })).toThrow();
    expect(() => new GeneraId({ apiKey: "x", baseUrl: "" })).toThrow();
  });

  it("envia Authorization e monta a URL sem barra dupla", async () => {
    const fetchMock = fetchMockOf(async () => jsonResponse(200, []));
    await makeClient(fetchMock).applications.list();

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe("https://id.example.com/api/v1/applications");
    expect(new Headers(init!.headers).get("Authorization")).toBe("Bearer gid_sk_teste");
  });

  it("serializa o body e o Content-Type no POST", async () => {
    const fetchMock = fetchMockOf(async () =>
      jsonResponse(201, { clientId: "portal", redirectUris: [], postLogoutRedirectUris: [] }),
    );
    const app = await makeClient(fetchMock).applications.create({
      clientId: "portal",
      displayName: "Portal",
      redirectUris: ["https://acme.com/callback"],
    });

    const [, init] = fetchMock.mock.calls[0]!;
    expect(init!.method).toBe("POST");
    expect(new Headers(init!.headers).get("Content-Type")).toBe("application/json");
    expect(JSON.parse(String(init!.body)).clientId).toBe("portal");
    expect(app.clientId).toBe("portal");
  });

  it("rotateKeys envia revokeOldKeysNow só quando pedido", async () => {
    const result = { signingKeyThumbprint: "AB", oldKeysRetireAt: "2026-01-01T00:00:00Z", oldKeysRevokedImmediately: true };

    const emergencyMock = fetchMockOf(async () => jsonResponse(200, result));
    const emergency = await makeClient(emergencyMock).tenant.rotateKeys({ revokeOldKeysNow: true });
    const [url, init] = emergencyMock.mock.calls[0]!;
    expect(String(url)).toBe("https://id.example.com/api/v1/tenant/keys/rotate");
    expect(init!.method).toBe("POST");
    expect(JSON.parse(String(init!.body)).revokeOldKeysNow).toBe(true);
    expect(emergency.oldKeysRevokedImmediately).toBe(true);

    // Sem argumento: rotação de rotina, sem corpo.
    const routineMock = fetchMockOf(async () => jsonResponse(200, { ...result, oldKeysRevokedImmediately: false }));
    await makeClient(routineMock).tenant.rotateKeys();
    expect(routineMock.mock.calls[0]![1]!.body).toBeUndefined();
  });

  it("monta a query de paginação de usuários", async () => {
    const fetchMock = fetchMockOf(async () =>
      jsonResponse(200, { items: [], page: 2, pageSize: 50, totalCount: 0 }),
    );
    await makeClient(fetchMock).users.list({ query: "ana@acme", page: 2, pageSize: 50 });

    const url = new URL(String(fetchMock.mock.calls[0]![0]));
    expect(url.searchParams.get("query")).toBe("ana@acme");
    expect(url.searchParams.get("page")).toBe("2");
    expect(url.searchParams.get("pageSize")).toBe("50");
  });

  it("monta as rotas de histórico e replay de webhooks", async () => {
    const fetchMock = fetchMockOf(async () =>
      jsonResponse(200, { items: [], page: 1, pageSize: 20, totalCount: 0 }),
    );
    await makeClient(fetchMock).webhooks.listDeliveries("wh-1", { page: 3 });

    const url = new URL(String(fetchMock.mock.calls[0]![0]));
    expect(url.pathname).toBe("/api/v1/webhooks/wh-1/deliveries");
    expect(url.searchParams.get("page")).toBe("3");

    const replayMock = fetchMockOf(async () =>
      jsonResponse(202, { id: "d-1", eventType: "user.created", status: "pending", attempts: 1 }),
    );
    const replayed = await makeClient(replayMock).webhooks.replay("wh-1", "d-1");

    const [replayUrl, init] = replayMock.mock.calls[0]!;
    expect(new URL(String(replayUrl)).pathname).toBe("/api/v1/webhooks/wh-1/deliveries/d-1/replay");
    expect(init!.method).toBe("POST");
    expect(replayed.status).toBe("pending");
  });

  it("trata 204 como void (revogação de chave)", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    await expect(
      makeClient(fetchMock).apiKeys.revoke("0f8fad5b-d9cb-469f-a165-70867728950e"),
    ).resolves.toBeUndefined();
  });

  it("lança GeneraIdError com status e corpo em erro 4xx", async () => {
    const fetchMock = vi.fn(async () => jsonResponse(409, { detail: "slug em uso" }));
    const error = await makeClient(fetchMock)
      .tenants.create({ slug: "acme", name: "Acme" })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(GeneraIdError);
    expect((error as GeneraIdError).status).toBe(409);
    expect((error as GeneraIdError).body).toEqual({ detail: "slug em uso" });
  });

  it("faz retry em 429 respeitando Retry-After e depois sucede", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(429, "limite", { "Retry-After": "0" }))
      .mockResolvedValueOnce(jsonResponse(200, { items: [], page: 1, pageSize: 20, totalCount: 0 }));

    const result = await makeClient(fetchMock, 2).audits.list();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.totalCount).toBe(0);
  });

  it("não faz retry em 4xx comum", async () => {
    const fetchMock = vi.fn(async () => jsonResponse(404, "não achei"));
    await expect(makeClient(fetchMock, 2).users.get("abc")).rejects.toMatchObject({ status: 404 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
