/** Formatos de dados da Management API (`/api/v1/*`), espelhando os DTOs do servidor. */

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  /** "active" | "suspended" */
  status: string;
  createdAt: string;
  brandingJson: string | null;
  settingsJson: string | null;
  customDomain: string | null;
}

export interface CreateTenantInput {
  /** DNS-safe: minúsculas, dígitos e hífens (3–40 caracteres, sem hífen nas pontas). */
  slug: string;
  name: string;
  brandingJson?: string;
  settingsJson?: string;
}

export interface CreatedTenant {
  tenant: Tenant;
  /** Chave `gid_sk_…` do tenant — exibida uma única vez. */
  apiKey: string;
}

export interface UpdateTenantInput {
  name?: string;
  brandingJson?: string;
  settingsJson?: string;
  /** Hostname próprio (ex.: `id.acme.com.br`); `""` remove; omitido não altera. */
  customDomain?: string;
}

export interface KeyRotationResult {
  signingKeyThumbprint: string;
  /** Quando as chaves antigas saem do JWKS (30 dias). */
  oldKeysRetireAt: string;
}

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

export interface CreatedApiKey {
  apiKey: ApiKey;
  /** Segredo `gid_sk_…` — exibido uma única vez. */
  key: string;
}

export type ClientType = "public" | "confidential";
export type ConsentType = "implicit" | "explicit" | "external";

export interface Application {
  clientId: string | null;
  displayName: string | null;
  clientType: string | null;
  consentType: string | null;
  redirectUris: string[];
  postLogoutRedirectUris: string[];
  /** Presente apenas na criação de um client confidential (`gid_cs_…`). */
  clientSecret?: string | null;
}

export interface CreateApplicationInput {
  /** Único por tenant: letras, dígitos, ponto, hífen e sublinhado (3–100 caracteres). */
  clientId: string;
  displayName: string;
  /** Padrão: "public". PKCE é sempre obrigatório. */
  clientType?: ClientType;
  /** Padrão: "implicit". */
  consentType?: ConsentType;
  redirectUris: string[];
  postLogoutRedirectUris?: string[];
}

export interface UpdateApplicationInput {
  displayName: string;
  consentType?: ConsentType;
  redirectUris: string[];
  postLogoutRedirectUris?: string[];
}

export interface WebhookEndpoint {
  id: string;
  url: string;
  /** Vazio = todos os eventos. */
  events: string[];
  createdAt: string;
  /** Presente apenas na criação (`gid_whsec_…`) — guarde para verificar assinaturas. */
  secret?: string | null;
}

export interface CreateWebhookInput {
  /** URL HTTPS absoluta. */
  url: string;
  /** `user.created` | `user.updated` | `session.created`; vazio/omitido = todos. */
  events?: string[];
}

export type WebhookDeliveryStatus = "pending" | "succeeded" | "failed";

/** Entrega persistida de um webhook (histórico de 30 dias; replay disponível). */
export interface WebhookDeliveryRecord {
  id: string;
  eventType: string;
  status: WebhookDeliveryStatus | string;
  attempts: number;
  lastStatusCode: number | null;
  lastError: string | null;
  createdAt: string;
  deliveredAt: string | null;
  /** Próxima tentativa agendada (apenas quando `status` é "pending"). */
  nextAttemptAt: string | null;
  /** O corpo exato enviado ao endpoint (byte a byte). */
  payloadJson: string;
}

export interface User {
  id: string;
  userName: string | null;
  email: string | null;
  displayName: string | null;
  emailConfirmed: boolean;
  twoFactorEnabled: boolean;
  lockedOut: boolean;
  createdAt: string;
}

export interface LoginAudit {
  id: string;
  /** Ex.: "LoginSuccess", "LoginFailure", "TwoFactorSuccess", "Lockout". */
  event: string;
  userId: string | null;
  identifier: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface PageQuery {
  page?: number;
  /** Máx. 200. */
  pageSize?: number;
}
