// All crypto operations run client-side only (Web Crypto API)

const PBKDF2_ITERATIONS = 600_000;
const KEY_LENGTH = 256;

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
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
    true, // extractable for sessionStorage persistence
    ["encrypt", "decrypt"]
  );
}

const PIN_PBKDF2_ITERATIONS = 300_000;

/** Encrypt master key with a PIN (reduced iterations for faster unlock) */
export async function encryptMasterKeyWithPin(
  masterKey: CryptoKey,
  pin: string
): Promise<{ encryptedKey: string; salt: string; iv: string }> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(pin),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  const wrappingKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: PIN_PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );

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

/** Decrypt master key using a PIN */
export async function decryptMasterKeyWithPin(
  encryptedKeyB64: string,
  saltB64: string,
  ivB64: string,
  pin: string
): Promise<CryptoKey> {
  const encryptedKey = base64ToBuffer(encryptedKeyB64);
  const salt = base64ToBuffer(saltB64);
  const iv = base64ToBuffer(ivB64);

  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(pin),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  const wrappingKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: PIN_PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );

  const rawKey = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    wrappingKey,
    encryptedKey
  );

  return crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "AES-GCM", length: KEY_LENGTH },
    true,
    ["encrypt", "decrypt"]
  );
}

/** Export a CryptoKey to base64 string for sessionStorage */
export async function exportMasterKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey("raw", key);
  return bufferToBase64(raw);
}

/** Import a base64 string back into a CryptoKey */
export async function importMasterKey(b64: string): Promise<CryptoKey> {
  const raw = base64ToBuffer(b64);
  return crypto.subtle.importKey(
    "raw",
    raw,
    { name: "AES-GCM", length: KEY_LENGTH },
    true,
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

/** Generate a random 256-bit AES-GCM room key (extractable for URL sharing) */
export async function generateRoomKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: "AES-GCM", length: KEY_LENGTH },
    true, // extractable so it can be shared via URL
    ["encrypt", "decrypt"]
  );
}

/** Export room key to base64 string for URL embedding */
export async function exportRoomKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey("raw", key);
  return bufferToBase64(raw);
}

/** Import room key from base64 string */
export async function importRoomKey(b64: string): Promise<CryptoKey> {
  const raw = base64ToBuffer(b64);
  return crypto.subtle.importKey(
    "raw",
    raw,
    { name: "AES-GCM", length: KEY_LENGTH },
    true, // extractable so it can be re-exported for URL sharing
    ["encrypt", "decrypt"]
  );
}
