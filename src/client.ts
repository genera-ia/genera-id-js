import { request, type HttpOptions } from "./http.js";
import type {
  ApiKey,
  Application,
  CreateApplicationInput,
  CreateTenantInput,
  CreateWebhookInput,
  CreatedApiKey,
  CreatedTenant,
  KeyRotationResult,
  LoginAudit,
  PagedResult,
  PageQuery,
  RotateKeysInput,
  Tenant,
  UpdateApplicationInput,
  UpdateTenantInput,
  User,
  WebhookDeliveryRecord,
  WebhookEndpoint,
} from "./types.js";

export interface GeneraIdOptions {
  /** Chave de tenant (`gid_sk_…`) ou de plataforma, conforme os recursos usados. */
  apiKey: string;
  /** Origem do serviço, ex.: `https://genera-id.onrender.com`. */
  baseUrl: string;
  /** Tentativas extras em 429/5xx (padrão 2; 0 desliga). */
  maxRetries?: number;
  /** Implementação de fetch (padrão: global). */
  fetch?: typeof globalThis.fetch;
}

/** Cliente da Management API do Genera ID (`/api/v1/*`). */
export class GeneraId {
  private readonly http: HttpOptions;

  constructor(options: GeneraIdOptions) {
    if (!options.apiKey) {
      throw new Error("apiKey é obrigatória.");
    }
    if (!options.baseUrl) {
      throw new Error("baseUrl é obrigatória (ex.: https://genera-id.onrender.com).");
    }
    this.http = {
      apiKey: options.apiKey,
      baseUrl: options.baseUrl,
      maxRetries: options.maxRetries ?? 2,
      fetch: options.fetch ?? globalThis.fetch.bind(globalThis),
    };
  }

  /** Onboarding e listagem de tenants — requer a chave de PLATAFORMA. */
  readonly tenants = {
    create: (input: CreateTenantInput): Promise<CreatedTenant> =>
      request(this.http, "POST", "/api/v1/tenants", input),
    list: (): Promise<Tenant[]> => request(this.http, "GET", "/api/v1/tenants"),
  };

  /** O próprio tenant da chave `gid_sk_…`. */
  readonly tenant = {
    get: (): Promise<Tenant> => request(this.http, "GET", "/api/v1/tenant"),
    update: (input: UpdateTenantInput): Promise<Tenant> =>
      request(this.http, "PATCH", "/api/v1/tenant", input),
    /**
     * Rotaciona as chaves de assinatura; as antigas seguem no JWKS por 30 dias.
     * Passe `{ revokeOldKeysNow: true }` (emergência, chave comprometida) para
     * aposentá-las na hora — elas saem do JWKS e todo token assinado com elas
     * passa a ser rejeitado.
     */
    rotateKeys: (input?: RotateKeysInput): Promise<KeyRotationResult> =>
      request(this.http, "POST", "/api/v1/tenant/keys/rotate", input),
  };

  readonly apiKeys = {
    list: (): Promise<ApiKey[]> => request(this.http, "GET", "/api/v1/api-keys"),
    /** O segredo retornado em `key` aparece uma única vez. */
    create: (name: string): Promise<CreatedApiKey> =>
      request(this.http, "POST", "/api/v1/api-keys", { name }),
    /** Revogação com efeito imediato. */
    revoke: (id: string): Promise<void> =>
      request(this.http, "DELETE", `/api/v1/api-keys/${encodeURIComponent(id)}`),
  };

  readonly applications = {
    list: (): Promise<Application[]> => request(this.http, "GET", "/api/v1/applications"),
    /** Clients confidential recebem `clientSecret` uma única vez. PKCE é sempre obrigatório. */
    create: (input: CreateApplicationInput): Promise<Application> =>
      request(this.http, "POST", "/api/v1/applications", input),
    get: (clientId: string): Promise<Application> =>
      request(this.http, "GET", `/api/v1/applications/${encodeURIComponent(clientId)}`),
    update: (clientId: string, input: UpdateApplicationInput): Promise<Application> =>
      request(this.http, "PUT", `/api/v1/applications/${encodeURIComponent(clientId)}`, input),
    /** Remove o client e revoga autorizações e tokens em cascata. */
    delete: (clientId: string): Promise<void> =>
      request(this.http, "DELETE", `/api/v1/applications/${encodeURIComponent(clientId)}`),
  };

  readonly webhooks = {
    list: (): Promise<WebhookEndpoint[]> => request(this.http, "GET", "/api/v1/webhooks"),
    /** O `secret` (`gid_whsec_…`) aparece uma única vez. */
    create: (input: CreateWebhookInput): Promise<WebhookEndpoint> =>
      request(this.http, "POST", "/api/v1/webhooks", input),
    delete: (id: string): Promise<void> =>
      request(this.http, "DELETE", `/api/v1/webhooks/${encodeURIComponent(id)}`),
    /** Histórico de entregas do endpoint (mais recente primeiro; retenção de 30 dias). */
    listDeliveries: (id: string, query?: PageQuery): Promise<PagedResult<WebhookDeliveryRecord>> =>
      request(this.http, "GET", `/api/v1/webhooks/${encodeURIComponent(id)}/deliveries`, undefined, {
        page: query?.page,
        pageSize: query?.pageSize,
      }),
    /** Reenvia a entrega (mesmo payload, byte a byte) — qualquer estado, inclusive sucesso. */
    replay: (id: string, deliveryId: string): Promise<WebhookDeliveryRecord> =>
      request(this.http, "POST",
        `/api/v1/webhooks/${encodeURIComponent(id)}/deliveries/${encodeURIComponent(deliveryId)}/replay`),
  };

  readonly users = {
    list: (query?: PageQuery & { query?: string }): Promise<PagedResult<User>> =>
      request(this.http, "GET", "/api/v1/users", undefined, {
        query: query?.query,
        page: query?.page,
        pageSize: query?.pageSize,
      }),
    get: (id: string): Promise<User> =>
      request(this.http, "GET", `/api/v1/users/${encodeURIComponent(id)}`),
  };

  readonly audits = {
    list: (query?: PageQuery & { userId?: string }): Promise<PagedResult<LoginAudit>> =>
      request(this.http, "GET", "/api/v1/audits", undefined, {
        userId: query?.userId,
        page: query?.page,
        pageSize: query?.pageSize,
      }),
  };
}
