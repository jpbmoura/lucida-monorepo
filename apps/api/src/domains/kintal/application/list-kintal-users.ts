import type {
  KintalUserListItem,
  KintalUsersRepository,
  ListKintalUsersFilter,
} from "./ports/kintal-users-repository.js";

export interface ListKintalUsersInput {
  q?: string;
  subscription?: "any" | "with" | "without";
  role?: "any" | "user" | "staff";
  limit?: number;
  before?: Date;
}

export interface KintalUserListItemDTO {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string | null;
  whatsapp: string | null;
  institutionType: string | null;
  stateUf: string | null;
  createdAt: string;
  creditBalance: number;
  subscription: { planId: string; status: string } | null;
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export class ListKintalUsersUseCase {
  constructor(private readonly users: KintalUsersRepository) {}

  async execute(input: ListKintalUsersInput): Promise<KintalUserListItemDTO[]> {
    const filter: ListKintalUsersFilter = {
      q: input.q?.trim() || undefined,
      subscription: input.subscription ?? "any",
      role: input.role ?? "any",
      limit: Math.min(MAX_LIMIT, input.limit ?? DEFAULT_LIMIT),
      before: input.before,
    };
    const items = await this.users.list(filter);
    return items.map(toDTO);
  }
}

function toDTO(u: KintalUserListItem): KintalUserListItemDTO {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    image: u.image,
    role: u.role,
    whatsapp: u.whatsapp,
    institutionType: u.institutionType,
    stateUf: u.stateUf,
    createdAt: u.createdAt.toISOString(),
    creditBalance: u.creditBalance,
    subscription: u.subscription,
  };
}
