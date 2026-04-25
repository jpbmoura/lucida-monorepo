import type {
  StaffMember,
  StaffRepository,
} from "./ports/staff-repository.js";
import {
  AlreadyStaffError,
  UserNotFoundError,
} from "../domain/staff-errors.js";

interface Input {
  email: string;
}

export class PromoteToStaffUseCase {
  constructor(private readonly repo: StaffRepository) {}

  async execute(input: Input): Promise<StaffMember> {
    const normalized = input.email.trim().toLowerCase();
    const user = await this.repo.findByEmail(normalized);
    if (!user) throw new UserNotFoundError();
    if (user.role === "staff") throw new AlreadyStaffError();

    const now = new Date();
    await this.repo.promoteToStaff(user.id, now);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      staffSince: now,
      createdAt: user.createdAt,
    };
  }
}
