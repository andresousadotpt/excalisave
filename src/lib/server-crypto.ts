import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) throw new Error("ENCRYPTION_KEY env var is required");
  // Key must be 32 bytes. Accept hex (64 chars) or base64 (44 chars).
  if (key.length === 64) return Buffer.from(key, "hex");
  return Buffer.from(key, "base64");
}

/** Encrypt a string with server-side AES-256-GCM. Returns "iv:authTag:ciphertext" in hex. */
export function serverEncrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

/** Decrypt a server-side encrypted string. */
export function serverDecrypt(data: string): string {
  const key = getKey();
  const [ivHex, authTagHex, ciphertextHex] = data.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const ciphertext = Buffer.from(ciphertextHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(ciphertext).toString("utf8") + decipher.final("utf8");
}

/** SHA-256 hash of a normalized (lowercased, trimmed) email for lookups. */
export function hashEmail(email: string): string {
  const normalized = email.toLowerCase().trim();
  return crypto.createHash("sha256").update(normalized).digest("hex");
}
