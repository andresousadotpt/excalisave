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

/** Decrypt a server-side encrypted string. Gracefully returns the original string if it's not in the expected encrypted format (e.g. legacy plaintext data from before encryption was enabled). */
export function serverDecrypt(data: string): string {
  const parts = data.split(":");
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
    // Not in encrypted format — return as-is (legacy plaintext)
    return data;
  }

  try {
    const key = getKey();
    const iv = Buffer.from(parts[0], "hex");
    const authTag = Buffer.from(parts[1], "hex");
    const ciphertext = Buffer.from(parts[2], "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    return decipher.update(ciphertext).toString("utf8") + decipher.final("utf8");
  } catch {
    // Decryption failed — likely plaintext from before encryption was enabled
    return data;
  }
}

/** SHA-256 hash of a normalized (lowercased, trimmed) email for lookups. */
export function hashEmail(email: string): string {
  const normalized = email.toLowerCase().trim();
  return crypto.createHash("sha256").update(normalized).digest("hex");
}
