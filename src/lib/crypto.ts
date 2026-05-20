import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto";

/**
 * AES-256-GCM message encryption.
 *
 * Per CLAUDE.md rule #6: messages are encrypted at rest, decrypted only at
 * the API boundary. Key is derived from ENCRYPTION_KEY env var via SHA-256
 * so any string length is accepted but we always get a 32-byte key.
 *
 * A fresh 12-byte IV is generated per message; the auth tag is appended to
 * the ciphertext so we get integrity + confidentiality with a single store.
 */

const ALGO = "aes-256-gcm";
const IV_LEN = 12;

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "ENCRYPTION_KEY missing. Set it in .env.local — required for message encryption."
    );
  }
  return createHash("sha256").update(raw).digest();
}

export interface EncryptedMessage {
  /** Ciphertext + auth tag, base64 */
  ciphertext: string;
  /** Initialization vector, base64 */
  iv: string;
}

export function encryptMessage(plaintext: string): EncryptedMessage {
  const key = getKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: Buffer.concat([ct, tag]).toString("base64"),
    iv: iv.toString("base64"),
  };
}

export function decryptMessage(ciphertextB64: string, ivB64: string): string {
  const key = getKey();
  const iv = Buffer.from(ivB64, "base64");
  const buf = Buffer.from(ciphertextB64, "base64");
  // Last 16 bytes are the GCM auth tag
  const tag = buf.subarray(buf.length - 16);
  const ct = buf.subarray(0, buf.length - 16);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}
