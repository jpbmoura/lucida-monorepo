import type { TokenCipher } from "../application/ports/token-cipher.js";
import { ClassroomNotConfiguredError } from "../domain/classroom-errors.js";

/**
 * Stub de cifra quando CLASSROOM_TOKEN_ENC_KEY não está setada. Nunca deveria
 * ser chamado (sem cifra não persistimos credencial), mas mantém o
 * repositório instanciável e falha alto se algo escapar.
 */
export class UnavailableTokenCipher implements TokenCipher {
  encrypt(): never {
    throw new ClassroomNotConfiguredError();
  }
  decrypt(): never {
    throw new ClassroomNotConfiguredError();
  }
}
