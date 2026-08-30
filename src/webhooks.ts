import { createHmac, timingSafeEqual } from "node:crypto";

export interface VerifyWebhookInput {
  /** Segredo `gid_whsec_…`, recebido uma única vez na criação do endpoint. */
  secret: string;
  /** Cabeçalho `X-GeneraId-Timestamp` (Unix, em segundos). */
  timestamp: string;
  /** Corpo BRUTO da requisição, antes de qualquer parse. */
  body: string;
  /** Cabeçalho `X-GeneraId-Signature` (`v1=<hex>`). */
  signature: string;
  /** Idade máxima aceita, em segundos (padrão 300). `0` desliga a checagem. */
  toleranceSeconds?: number;
  /** Instante atual em ms (padrão `Date.now()`; útil em testes). */
  nowMs?: number;
}

/**
 * Verifica a assinatura HMAC-SHA256 de uma entrega de webhook do Genera ID:
 * `v1=` + HMAC(secret, `{timestamp}.{body}`), em comparação de tempo constante,
 * rejeitando timestamps fora da tolerância (replay).
 */
export function verifyWebhookSignature(input: VerifyWebhookInput): boolean {
  const tolerance = input.toleranceSeconds ?? 300;
  if (tolerance > 0) {
    const sentAt = Number(input.timestamp);
    if (!Number.isFinite(sentAt)) {
      return false;
    }
    const nowSeconds = (input.nowMs ?? Date.now()) / 1000;
    if (Math.abs(nowSeconds - sentAt) > tolerance) {
      return false;
    }
  }

  const expected =
    "v1=" +
    createHmac("sha256", input.secret)
      .update(`${input.timestamp}.${input.body}`)
      .digest("hex");

  const a = Buffer.from(expected);
  const b = Buffer.from(input.signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
