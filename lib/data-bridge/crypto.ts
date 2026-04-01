/**
 * AES-256-GCM encryption for `lims_connections.connection_config` at rest.
 * Key: `LIMS_ENCRYPTION_KEY` — 64 hex chars (32 bytes).
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const KEY_BYTES = 32;

export function getLimsEncryptionKey(): string {
  const raw = process.env.LIMS_ENCRYPTION_KEY?.trim().replace(/^["']|["']$/g, "") ?? "";
  if (!raw || raw.length !== 64 || !/^[0-9a-fA-F]+$/.test(raw)) {
    throw new Error(
      "LIMS_ENCRYPTION_KEY must be set to a 64-character hex string (32 bytes). Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  return raw.toLowerCase();
}

/** Encrypted envelope stored inside JSONB `connection_config`. */
export type EncryptedConnectionConfigBlob = {
  _enc: true;
  v: 1;
  iv: string;
  ct: string;
  tag: string;
};

export function isEncryptedEnvelope(
  value: unknown
): value is EncryptedConnectionConfigBlob {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  return (
    o._enc === true &&
    o.v === 1 &&
    typeof o.iv === "string" &&
    typeof o.ct === "string" &&
    typeof o.tag === "string"
  );
}

export function encryptConnectionConfig(
  plain: Record<string, unknown>,
  keyHex?: string
): EncryptedConnectionConfigBlob {
  const key = Buffer.from(keyHex ?? getLimsEncryptionKey(), "hex");
  if (key.length !== KEY_BYTES) {
    throw new Error("LIMS_ENCRYPTION_KEY must decode to 32 bytes");
  }
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const json = JSON.stringify(plain);
  const enc = Buffer.concat([cipher.update(json, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    _enc: true,
    v: 1,
    iv: iv.toString("base64"),
    ct: enc.toString("base64"),
    tag: tag.toString("base64"),
  };
}

export function decryptConnectionConfig(
  stored: unknown,
  keyHex?: string
): Record<string, unknown> {
  if (stored && typeof stored === "object" && stored !== null) {
    const o = stored as Record<string, unknown>;
    if (!isEncryptedEnvelope(stored) && ("host" in o || "database" in o)) {
      return { ...o } as Record<string, unknown>;
    }
  }
  if (!isEncryptedEnvelope(stored)) {
    throw new Error("Invalid or unsupported connection_config payload");
  }
  const key = Buffer.from(keyHex ?? getLimsEncryptionKey(), "hex");
  if (key.length !== KEY_BYTES) {
    throw new Error("LIMS_ENCRYPTION_KEY must decode to 32 bytes");
  }
  const iv = Buffer.from(stored.iv, "base64");
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(Buffer.from(stored.tag, "base64"));
  const dec = Buffer.concat([
    decipher.update(Buffer.from(stored.ct, "base64")),
    decipher.final(),
  ]);
  return JSON.parse(dec.toString("utf8")) as Record<string, unknown>;
}

/** Remove secrets before logging or returning error details. */
export function sanitizeConnectionConfigForLog(
  cfg: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...cfg };
  if ("password" in out) out.password = "[redacted]";
  return out;
}
