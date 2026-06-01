/**
 * Porta de cifra simétrica para tokens OAuth em repouso. Implementada em
 * infra por `AesGcmTokenCipher` (AES-256-GCM). O domínio/use cases não
 * conhecem a chave nem o algoritmo.
 */
export interface TokenCipher {
  encrypt(plaintext: string): string;
  decrypt(ciphertext: string): string;
}
