import { randomInt } from "node:crypto";

// Código de 7 dígitos usado nas folhas de OMR — precisa ser único por turma.
// A checagem de unicidade é do use case; aqui só validamos formato.
const CODE_REGEX = /^[0-9]{7}$/;

export class StudentCode {
  private constructor(private readonly raw: string) {}

  static of(value: string): StudentCode {
    if (!CODE_REGEX.test(value)) {
      throw new Error("Código do aluno deve ter exatamente 7 dígitos.");
    }
    return new StudentCode(value);
  }

  static generate(): StudentCode {
    // randomInt exclui o max — produz 0..9_999_999, preenchemos com zeros à esquerda.
    const n = randomInt(0, 10_000_000);
    return new StudentCode(n.toString().padStart(7, "0"));
  }

  toString(): string {
    return this.raw;
  }

  equals(other: StudentCode): boolean {
    return this.raw === other.raw;
  }
}
