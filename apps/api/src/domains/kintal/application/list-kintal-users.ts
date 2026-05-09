import type {
  KintalUserListItem,
  KintalUsersRepository,
  ListKintalUsersFilter,
  ListSubscriptionFilter,
} from "./ports/kintal-users-repository.js";

export interface ListKintalUsersInput {
  q?: string;
  subscription?: ListSubscriptionFilter;
  role?: "any" | "user" | "staff";
  /** Janela pra "novos usuários". Backend converte pra `createdAfter`. */
  createdWithin?: "today" | "7d" | "30d";
  page?: number;
  pageSize?: number;
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

export interface ListKintalUsersResultDTO {
  items: KintalUserListItemDTO[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

export class ListKintalUsersUseCase {
  constructor(private readonly users: KintalUsersRepository) {}

  async execute(
    input: ListKintalUsersInput,
  ): Promise<ListKintalUsersResultDTO> {
    const page = input.page && input.page > 0 ? input.page : 1;
    const pageSize = clampPageSize(input.pageSize);
    const filter: ListKintalUsersFilter = {
      q: input.q?.trim() || undefined,
      subscription: input.subscription ?? "any",
      role: input.role ?? "any",
      createdAfter: createdAfterFromWindow(input.createdWithin),
      page,
      pageSize,
    };
    const result = await this.users.list(filter);
    return {
      items: result.items.map(toDTO),
      total: result.total,
      page,
      pageSize,
      hasMore: result.hasMore,
    };
  }
}

function clampPageSize(raw: number | undefined): number {
  if (!raw || raw <= 0) return DEFAULT_PAGE_SIZE;
  return Math.min(raw, MAX_PAGE_SIZE);
}

function createdAfterFromWindow(
  win: ListKintalUsersInput["createdWithin"],
): Date | undefined {
  if (!win) return undefined;
  const now = new Date();
  const startOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  if (win === "today") return startOfDay;
  if (win === "7d") {
    const d = new Date(startOfDay);
    d.setDate(d.getDate() - 6);
    return d;
  }
  if (win === "30d") {
    const d = new Date(startOfDay);
    d.setDate(d.getDate() - 29);
    return d;
  }
  return undefined;
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
