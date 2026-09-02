# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/); versionamento [SemVer](https://semver.org/lang/pt-BR/).

## [0.3.0] — 2026-09-02

### Adicionado

- Recurso `organizations`: CRUD de organizações (workspaces dentro do tenant), `.memberships` (`list`/`add`/`updateRole`/`remove`) e `.invitations` (`list`/`create`/`revoke`). `invitations.create` devolve `link` uma única vez na resposta, como o secret de webhook.
- `users.listOrganizations` — organizações de um usuário no tenant, com o papel em cada uma.
- `tenant.rotateKeys` aceita `{ revokeOldKeysNow: true }` para revogação emergencial (chave comprometida): aposenta as chaves antigas na hora em vez da graça de 30 dias. Retrocompatível — sem argumento continua sendo rotação de rotina. `KeyRotationResult` ganha `oldKeysRevokedImmediately`.

## [0.2.0] — 2026-08-30

### Adicionado

- `webhooks.listDeliveries` e `webhooks.replay` — histórico de entregas do endpoint (30 dias de retenção) e reenvio do mesmo payload.

## [0.1.0] — 2026-08-30

### Adicionado

- Release inicial: cliente tipado da Management API (`tenant`, `tenants`, `apiKeys`, `applications`, `webhooks`, `users`, `audits`), com retry automático em `429`/`5xx` (backoff configurável via `maxRetries`) e erros tipados (`GeneraIdError`).
- `verifyWebhookSignature` — verificação de assinatura de webhooks (HMAC-SHA256, comparação de tempo constante, tolerância de timestamp configurável).

[0.3.0]: https://github.com/genera-ia/genera-id-js/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/genera-ia/genera-id-js/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/genera-ia/genera-id-js/releases/tag/v0.1.0
