import type {
  StaffMember,
  StaffRepository,
} from "./ports/staff-repository.js";

export class ListStaffUseCase {
  constructor(private readonly repo: StaffRepository) {}

  execute(): Promise<StaffMember[]> {
    return this.repo.listStaff();
  }
}
