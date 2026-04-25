import { ClassId } from "../domain/class-id.js";
import { ClassNotFoundError } from "../domain/class-errors.js";
import type { ClassRepository } from "../domain/class-repository.js";

interface Input {
  classId: string;
  ownerId: string;
  name?: string;
  description?: string;
}

export class UpdateClassUseCase {
  constructor(private readonly classes: ClassRepository) {}

  async execute(input: Input): Promise<void> {
    const cls = await this.classes.findById(ClassId.of(input.classId));
    if (!cls || !cls.isOwnedBy(input.ownerId)) {
      throw new ClassNotFoundError();
    }
    const now = new Date();
    if (input.name !== undefined) cls.rename(input.name, now);
    if (input.description !== undefined) cls.updateDescription(input.description, now);
    await this.classes.save(cls);
  }
}
