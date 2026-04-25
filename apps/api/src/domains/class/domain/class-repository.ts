import type { Class } from "./class.js";
import type { ClassId } from "./class-id.js";

export interface ClassRepository {
  nextId(): ClassId;
  save(cls: Class): Promise<void>;
  findById(id: ClassId): Promise<Class | null>;
  findByOwner(ownerId: string): Promise<Class[]>;
  delete(id: ClassId): Promise<void>;
}
