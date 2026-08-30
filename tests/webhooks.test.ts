import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyWebhookSignature } from "../src/webhooks.js";

const secret = "gid_whsec_teste";
const body = '{"event":"user.created","data":{"id":"abc"}}';

function sign(timestamp: string, payload: string, key = secret): string {
  return "v1=" + createHmac("sha256", key).update(`${timestamp}.${payload}`).digest("hex");
}

describe("verifyWebhookSignature", () => {
  const timestamp = "1700000000";
  const nowMs = 1_700_000_010_000; // 10s depois do envio

  it("aceita assinatura válida dentro da tolerância", () => {
    expect(
      verifyWebhookSignature({
        secret,
        timestamp,
        body,
        signature: sign(timestamp, body),
        nowMs,
      }),
    ).toBe(true);
  });

  it("rejeita corpo adulterado", () => {
    expect(
      verifyWebhookSignature({
        secret,
        timestamp,
        body: body.replace("abc", "xyz"),
        signature: sign(timestamp, body),
        nowMs,
      }),
    ).toBe(false);
  });

  it("rejeita segredo errado", () => {
    expect(
      verifyWebhookSignature({
        secret,
        timestamp,
        body,
        signature: sign(timestamp, body, "gid_whsec_outro"),
        nowMs,
      }),
    ).toBe(false);
  });

  it("rejeita timestamp fora da tolerância (replay)", () => {
    expect(
      verifyWebhookSignature({
        secret,
        timestamp,
        body,
        signature: sign(timestamp, body),
        nowMs: nowMs + 301_000,
      }),
    ).toBe(false);
  });

  it("aceita timestamp antigo com tolerância desligada", () => {
    expect(
      verifyWebhookSignature({
        secret,
        timestamp,
        body,
        signature: sign(timestamp, body),
        toleranceSeconds: 0,
        nowMs: nowMs + 301_000,
      }),
    ).toBe(true);
  });

  it("rejeita assinatura de tamanho diferente sem lançar", () => {
    expect(
      verifyWebhookSignature({ secret, timestamp, body, signature: "v1=curta", nowMs }),
    ).toBe(false);
  });
});
