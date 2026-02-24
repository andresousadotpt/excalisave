import crypto from "crypto";

const COLLAB_SECRET = process.env.COLLAB_SECRET ?? "";

function base64UrlEncode(data: string): string {
  return Buffer.from(data).toString("base64url");
}

/**
 * Generate a short-lived HMAC-signed token for collab server authentication.
 * Token format: base64url(payload).hmac_hex
 */
export function generateCollabToken(userId: string): string {
  if (!COLLAB_SECRET) {
    throw new Error("COLLAB_SECRET env var is required");
  }

  const payload = JSON.stringify({
    userId,
    exp: Math.floor(Date.now() / 1000) + 30, // 30 seconds
  });

  const encodedPayload = base64UrlEncode(payload);
  const signature = crypto
    .createHmac("sha256", COLLAB_SECRET)
    .update(encodedPayload)
    .digest("hex");

  return `${encodedPayload}.${signature}`;
}
