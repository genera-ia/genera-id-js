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
  /** SSO corporativo (SAML) liberado para o tenant — ver `tenants.update` e `samlConnections`. */
  ssoEnabled: boolean;
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

/** Ajustes que só a plataforma faz (`tenants.update`, chave de plataforma). */
export interface UpdateTenantPlatformInput {
  /** Libera/bloqueia o SSO corporativo (SAML) — recurso comercial. */
  ssoEnabled?: boolean;
}

export interface RotateKeysInput {
  /**
   * true = emergência (chave comprometida): aposenta as chaves antigas na hora
   * — elas saem do JWKS e todo token assinado com elas passa a ser rejeitado
   * (invalida sessões em curso). Ausente/false = rotação de rotina com graça.
   */
  revokeOldKeysNow?: boolean;
}

export interface KeyRotationResult {
  signingKeyThumbprint: string;
  /** Quando as chaves antigas saem do JWKS (30 dias; ou agora, se revogadas). */
  oldKeysRetireAt: string;
  /** true quando as chaves antigas foram aposentadas imediatamente. */
  oldKeysRevokedImmediately: boolean;
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
  /** Endpoint que recebe o `logout_token` (Back-Channel Logout 1.0); `null` = não participa. */
  backChannelLogoutUri: string | null;
  /** Todo login neste client exige segundo fator (step-up / cadastro de MFA). */
  requireMfa: boolean;
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
  /** Endpoint que recebe o `logout_token` quando a sessão do usuário no IdP termina. */
  backChannelLogoutUri?: string;
  /** Padrão: false. true = todo login neste client exige segundo fator. */
  requireMfa?: boolean;
}

export interface UpdateApplicationInput {
  displayName: string;
  consentType?: ConsentType;
  redirectUris: string[];
  postLogoutRedirectUris?: string[];
  /** Omitido/vazio remove o endpoint. */
  backChannelLogoutUri?: string;
  /** Omitido = não altera. */
  requireMfa?: boolean;
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
  /**
   * Ex.: `user.created`, `user.updated`, `session.created`, `user.mfaEnabled`,
   * `user.mfaDisabled`, `user.mfaReset`, `organization.*`; vazio/omitido = todos.
   */
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

/**
 * Organização (workspace) dentro do tenant. Papéis de membership são strings
 * opacas — o Genera ID só garante que nunca fica sem nenhum "owner".
 */
export interface Organization {
  id: string;
  name: string;
  slug: string;
  metadataJson: string | null;
  createdByUserId: string | null;
  createdAt: string;
}

export interface CreateOrganizationInput {
  name: string;
  /** Se omitido, derivado do nome. Único por tenant, imutável após criado. */
  slug?: string;
  metadataJson?: string;
}

export interface UpdateOrganizationInput {
  name?: string;
  metadataJson?: string;
}

export interface Membership {
  id: string;
  organizationId: string;
  userId: string;
  userEmail: string | null;
  userDisplayName: string | null;
  role: string;
  createdAt: string;
}

export interface CreateMembershipInput {
  userId: string;
  role: string;
}

export interface UpdateMembershipInput {
  role: string;
}

/** Organizações de um usuário, com o papel em cada uma — ver `users.listOrganizations`. */
export interface UserOrganization {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  role: string;
  createdAt: string;
}

export type InvitationStatus = "pending" | "accepted" | "revoked" | "expired";

export interface Invitation {
  id: string;
  organizationId: string;
  email: string;
  role: string;
  status: InvitationStatus | string;
  /** TTL de 7 dias a partir da criação. */
  expiresAt: string;
  createdAt: string;
  acceptedAt: string | null;
  /** Link de aceite — presente apenas na resposta da criação, uma única vez. */
  link?: string | null;
}

export interface CreateInvitationInput {
  email: string;
  role: string;
}

/** Domínio de e-mail atendido por uma conexão SAML (único por tenant). */
export interface SamlDomain {
  /** Minúsculo, sem "@" (ex.: `acme.com.br`). */
  domain: string;
  /** true = domínio só entra por SSO: sem login, recuperação, cadastro ou troca de senha. */
  enforceSso: boolean;
}

export interface SamlCertificate {
  thumbprint: string;
  subject: string;
  notAfter: string;
  /** Preenchido quando o certificado saiu da metadata do IdP: continua aceito até esta data. */
  retireAt: string | null;
}

/** O que se cadastra no IdP da empresa (Entra: Identifier/Reply URL; Okta: Audience URI/SSO URL). */
export interface SamlServiceProvider {
  entityId: string;
  acsUrls: string[];
  metadataUrl: string;
}

/** Campos do perfil que podem vir de um atributo SAML específico. */
export type SamlAttributeField = "email" | "givenName" | "familyName" | "displayName";

/** Conexão de SSO corporativo: o Genera ID como SP SAML diante do IdP de uma empresa. */
export interface SamlConnection {
  id: string;
  name: string;
  enabled: boolean;
  /** false enquanto a conexão aguarda os dados do IdP (fica fora de qualquer login). */
  idpConfigured: boolean;
  idpEntityId: string | null;
  idpSsoUrl: string | null;
  /** Com URL, SSO URL e certificados são atualizados diariamente. */
  idpMetadataUrl: string | null;
  metadataRefreshedAt: string | null;
  /** Último erro da atualização automática (null quando a última deu certo). */
  metadataRefreshError: string | null;
  idpCertificates: SamlCertificate[];
  attributeMapping: Partial<Record<SamlAttributeField, string>> | null;
  stableIdAttribute: string | null;
  jitProvisioning: boolean;
  trustIdpMfa: boolean;
  organizationId: string | null;
  defaultRole: string;
  domains: SamlDomain[];
  serviceProvider: SamlServiceProvider;
  createdAt: string;
  updatedAt: string;
}

interface SamlConnectionFields {
  /** XML de metadata exportado do IdP. */
  idpMetadataXml?: string;
  /** HTTPS pública; atualizada todo dia (acompanha a rotação de certificado do IdP). */
  idpMetadataUrl?: string;
  idpEntityId?: string;
  idpSsoUrl?: string;
  /** PEM ou DER em base64 (só a parte pública). */
  idpCertificates?: string[];
  attributeMapping?: Partial<Record<SamlAttributeField, string>>;
  /** Atributo usado como chave estável no lugar do NameID (ex.: objectidentifier no Entra). */
  stableIdAttribute?: string;
  /** Cria a conta no primeiro login (padrão true). Só vale para e-mails dos domínios da conexão. */
  jitProvisioning?: boolean;
  enabled?: boolean;
  /** Aceita o MFA declarado pelo IdP como segundo fator (padrão false). */
  trustIdpMfa?: boolean;
  /** Quem entra pela conexão vira membro desta organização. */
  organizationId?: string;
  /** Papel da membership automática (padrão "member"). */
  defaultRole?: string;
}

/**
 * Dados do IdP: `idpMetadataUrl`, `idpMetadataXml` ou os três campos manuais —
 * ou nenhum: a conexão nasce pendente (`idpConfigured: false`) e já devolve o
 * `serviceProvider` para cadastrar no IdP; a metadata vem depois, no `update`.
 */
export interface CreateSamlConnectionInput extends SamlConnectionFields {
  name: string;
  domains: SamlDomain[];
}

/** Campo omitido não muda; `""` remove `idpMetadataUrl`, `stableIdAttribute` e `organizationId`. */
export interface UpdateSamlConnectionInput extends SamlConnectionFields {
  name?: string;
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
