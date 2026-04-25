import { Class } from "../domain/class.js";
import type { ClassRepository } from "../domain/class-repository.js";

interface Input {
  name: string;
  description?: string;
  ownerId: string;
}

interface Output {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export class CreateClassUseCase {
  constructor(private readonly classes: ClassRepository) {}

  async execute(input: Input): Promise<Output> {
    const cls = Class.create({
      id: this.classes.nextId(),
      name: input.name,
      description: input.description,
      ownerId: input.ownerId,
    });
    await this.classes.save(cls);
    return {
      id: cls.id.toString(),
      name: cls.name,
      description: cls.description,
      ownerId: cls.ownerId,
      createdAt: cls.createdAt,
      updatedAt: cls.updatedAt,
    };
  }
}
