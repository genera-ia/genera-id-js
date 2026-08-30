# @genera-id/node

SDK oficial do [Genera ID](https://genera-id.onrender.com/docs) para Node.js: cliente tipado da **Management API** (`/api/v1/*`) e verificação de assinatura de **webhooks**.

> A integração de login (OIDC) não precisa de SDK — use qualquer biblioteca OpenID Connect apontando para o discovery do seu tenant. Veja [a documentação](https://genera-id.onrender.com/docs/oidc).

Requisitos: Node.js ≥ 18 (usa `fetch` nativo). Sem dependências de runtime.

## Instalação

```bash
npm install @genera-id/node
```

Enquanto a primeira versão não sai no npm, instale via git: `npm install github:genera-ia/genera-id-js`.

## Management API

```ts
import { GeneraId } from "@genera-id/node";

const generaId = new GeneraId({
  apiKey: process.env.GENERA_ID_API_KEY!, // gid_sk_…
  baseUrl: "https://genera-id.onrender.com",
});

// Cadastre a aplicação OIDC do seu produto
const app = await generaId.applications.create({
  clientId: "portal",
  displayName: "Portal Acme",
  redirectUris: ["https://portal.acme.com.br/callback"],
});

// Usuários e auditoria (somente leitura)
const { items } = await generaId.users.list({ query: "ana@acme" });

// Rotação de chaves de assinatura (30 dias de graça no JWKS)
await generaId.tenant.rotateKeys();
```

Recursos: `tenant` (get/update/rotateKeys), `tenants` (chave de plataforma), `apiKeys`, `applications`, `webhooks`, `users`, `audits`. Erros viram `GeneraIdError` com `status` e `body`; `429`/`5xx` têm retry automático com backoff (configure com `maxRetries`).

## Webhooks

O corpo **bruto** da requisição é obrigatório — verifique antes de qualquer parse:

```ts
import { verifyWebhookSignature } from "@genera-id/node";

app.post("/webhooks/genera-id", express.raw({ type: "application/json" }), (req, res) => {
  const valid = verifyWebhookSignature({
    secret: process.env.GENERA_ID_WEBHOOK_SECRET!, // gid_whsec_…
    timestamp: req.header("X-GeneraId-Timestamp")!,
    signature: req.header("X-GeneraId-Signature")!,
    body: req.body.toString("utf8"),
  });
  if (!valid) return res.status(400).end();

  // Trate como entrega "ao menos uma vez": handler idempotente.
  res.status(202).end();
});
```

A comparação é de tempo constante e timestamps além da tolerância (padrão 5 minutos) são rejeitados.

## Desenvolvimento

```bash
npm install
npm test
npm run build
```

Licença: MIT.
