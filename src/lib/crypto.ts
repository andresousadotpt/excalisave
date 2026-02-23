// All crypto operations run client-side only (Web Crypto API)

const PBKDF2_ITERATIONS = 600_000;
const KEY_LENGTH = 256;

function bufferToBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/** Generate a random 256-bit AES-GCM master key */
export async function generateMasterKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: "AES-GCM", length: KEY_LENGTH },
    true, // extractable so we can wrap it
    ["encrypt", "decrypt"]
  );
}

/** Derive a wrapping key from password using PBKDF2 */
async function deriveWrappingKey(
  password: string,
  salt: ArrayBuffer
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );
}

/** Encrypt master key with password-derived wrapping key */
export async function encryptMasterKey(
  masterKey: CryptoKey,
  password: string
): Promise<{ encryptedKey: string; salt: string; iv: string }> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const wrappingKey = await deriveWrappingKey(password, salt.buffer);

  // Export master key to raw bytes, then encrypt
  const rawKey = await crypto.subtle.exportKey("raw", masterKey);
  const encryptedKey = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    wrappingKey,
    rawKey
  );

  return {
    encryptedKey: bufferToBase64(encryptedKey),
    salt: bufferToBase64(salt.buffer),
    iv: bufferToBase64(iv.buffer),
  };
}

/** Decrypt master key using password */
export async function decryptMasterKey(
  encryptedKeyB64: string,
  saltB64: string,
  ivB64: string,
  password: string
): Promise<CryptoKey> {
  const encryptedKey = base64ToBuffer(encryptedKeyB64);
  const salt = base64ToBuffer(saltB64);
  const iv = base64ToBuffer(ivB64);

  const wrappingKey = await deriveWrappingKey(password, salt);
  const rawKey = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    wrappingKey,
    encryptedKey
  );

  return crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "AES-GCM", length: KEY_LENGTH },
    false, // non-extractable in memory
    ["encrypt", "decrypt"]
  );
}

/** Encrypt drawing data with master key */
export async function encryptDrawing(
  data: string,
  masterKey: CryptoKey
): Promise<{ encryptedData: string; iv: string }> {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encryptedData = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    masterKey,
    encoder.encode(data)
  );

  return {
    encryptedData: bufferToBase64(encryptedData),
    iv: bufferToBase64(iv.buffer),
  };
}

/** Decrypt drawing data with master key */
export async function decryptDrawing(
  encryptedDataB64: string,
  ivB64: string,
  masterKey: CryptoKey
): Promise<string> {
  const encryptedData = base64ToBuffer(encryptedDataB64);
  const iv = base64ToBuffer(ivB64);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    masterKey,
    encryptedData
  );

  return new TextDecoder().decode(decrypted);
}
