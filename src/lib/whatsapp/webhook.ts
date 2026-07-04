import crypto from "crypto";

/** Verifies the X-Hub-Signature-256 header against the raw request body. */
export function verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!signatureHeader) return false;
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) return false;

  const expected =
    "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
  } catch {
    return false;
  }
}

export function verifyWebhookSubscription(
  mode: string | null,
  token: string | null
): boolean {
  return mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN;
}
