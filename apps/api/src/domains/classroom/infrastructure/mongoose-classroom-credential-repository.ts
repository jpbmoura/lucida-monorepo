import { randomUUID } from "node:crypto";
import { ClassroomCredential } from "../domain/classroom-credential.js";
import type { ClassroomCredentialRepository } from "../domain/classroom-credential-repository.js";
import type { TokenCipher } from "../application/ports/token-cipher.js";
import {
  ClassroomCredentialModel,
  type ClassroomCredentialDoc,
} from "./classroom-credential-schema.js";

/**
 * Persiste a credencial cifrando os tokens na fronteira do Mongo. A entidade
 * trafega com tokens em texto plano; aqui eles viram `*Enc` via `TokenCipher`.
 */
export class MongooseClassroomCredentialRepository
  implements ClassroomCredentialRepository
{
  constructor(private readonly cipher: TokenCipher) {}

  nextId(): string {
    return randomUUID();
  }

  async save(credential: ClassroomCredential): Promise<void> {
    await ClassroomCredentialModel.updateOne(
      { teacherId: credential.teacherId },
      {
        $set: {
          organizationId: credential.organizationId,
          googleEmail: credential.googleEmail,
          accessTokenEnc: this.cipher.encrypt(credential.accessToken),
          refreshTokenEnc: this.cipher.encrypt(credential.refreshToken),
          expiresAt: credential.expiresAt,
          scopes: credential.scopes,
        },
        $setOnInsert: {
          _id: credential.id,
          teacherId: credential.teacherId,
          createdAt: credential.createdAt,
        },
      },
      { upsert: true },
    );
  }

  async findByTeacherId(teacherId: string): Promise<ClassroomCredential | null> {
    const doc = await ClassroomCredentialModel.findOne({ teacherId })
      .lean<ClassroomCredentialDoc>()
      .exec();
    return doc ? this.toEntity(doc) : null;
  }

  async deleteByTeacherId(teacherId: string): Promise<void> {
    await ClassroomCredentialModel.deleteOne({ teacherId }).exec();
  }

  private toEntity(doc: ClassroomCredentialDoc): ClassroomCredential {
    return ClassroomCredential.restore({
      id: doc._id,
      teacherId: doc.teacherId,
      organizationId: doc.organizationId ?? null,
      googleEmail: doc.googleEmail,
      accessToken: this.cipher.decrypt(doc.accessTokenEnc),
      refreshToken: this.cipher.decrypt(doc.refreshTokenEnc),
      expiresAt: doc.expiresAt,
      scopes: doc.scopes ?? [],
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }
}
