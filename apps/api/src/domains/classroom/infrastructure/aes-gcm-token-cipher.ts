import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import type { TokenCipher } from "../application/ports/token-cipher.js";

/**
 * Cifra AES-256-GCM pros tokens OAuth em repouso. Formato do texto cifrado:
 *
 *   base64( iv[12] | authTag[16] | ciphertext )
 *
 * A chave de 32 bytes é derivada da env `CLASSROOM_TOKEN_ENC_KEY` via SHA-256
 * (aceita qualquer string ≥ 32 chars — ex.: saída de `openssl rand -base64 32`).
 * GCM dá confidencialidade + integridade autenticada (detecta adulteração).
 */
const IV_BYTES = 12;
const TAG_BYTES = 16;

export class AesGcmTokenCipher implements TokenCipher {
  private readonly key: Buffer;

  constructor(secret: string) {
    this.key = createHash("sha256").update(secret, "utf8").digest();
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, "utf8"),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]).toString("base64");
  }

  decrypt(ciphertext: string): string {
    const raw = Buffer.from(ciphertext, "base64");
    const iv = raw.subarray(0, IV_BYTES);
    const tag = raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
    const data = raw.subarray(IV_BYTES + TAG_BYTES);
    const decipher = createDecipheriv("aes-256-gcm", this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString(
      "utf8",
    );
  }
}
