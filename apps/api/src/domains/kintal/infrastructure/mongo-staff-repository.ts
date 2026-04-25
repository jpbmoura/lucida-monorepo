import type { Db, Filter } from "mongodb";
import type {
  StaffMember,
  StaffRepository,
} from "../application/ports/staff-repository.js";

// Shape parcial do doc `user` da BA que precisamos ler. Outros additional
// fields existem (whatsapp, institutionType, etc) mas são irrelevantes pra
// admin de staff — ficam fora do tipo pra não mentir sobre o que é usado.
// Não tipamos a collection com esse shape porque BA armazena o `_id`
// ora como string, ora como ObjectId dependendo do adapter — e o generic
// do driver Mongo fixa um tipo por collection. Fazemos cast na leitura.
interface BaUserDoc {
  _id: unknown;
  id?: string;
  name: string | null;
  email: string;
  image: string | null;
  role?: string | null;
  staffSince?: Date | null;
  createdAt: Date;
}

export class MongoStaffRepository implements StaffRepository {
  constructor(private readonly authDb: Db) {}

  private get users() {
    return this.authDb.collection("user");
  }

  async listStaff(): Promise<StaffMember[]> {
    const rows = (await this.users
      .find({ role: "staff" })
      .sort({ name: 1 })
      .toArray()) as unknown as BaUserDoc[];
    return rows.map(toStaff);
  }

  async findByEmail(email: string) {
    const row = (await this.users.findOne({ email })) as unknown as
      | BaUserDoc
      | null;
    if (!row) return null;
    return { ...toStaff(row), role: row.role ?? null };
  }

  async promoteToStaff(userId: string, at: Date): Promise<void> {
    // BA adapters variam entre guardar _id como string ou ObjectId — o
    // find pelo campo lógico `id` cobre ambos; se não casar, fallback pro
    // _id string.
    const byLogicalId = await this.users.updateOne(
      { id: userId } as Filter<Record<string, unknown>>,
      { $set: { role: "staff", staffSince: at, updatedAt: at } },
    );
    if (byLogicalId.matchedCount === 0) {
      await this.users.updateOne(
        { _id: userId } as unknown as Filter<Record<string, unknown>>,
        { $set: { role: "staff", staffSince: at, updatedAt: at } },
      );
    }
  }

  async revokeStaff(userId: string): Promise<void> {
    const now = new Date();
    const byLogicalId = await this.users.updateOne(
      { id: userId } as Filter<Record<string, unknown>>,
      { $unset: { role: "", staffSince: "" }, $set: { updatedAt: now } },
    );
    if (byLogicalId.matchedCount === 0) {
      await this.users.updateOne(
        { _id: userId } as unknown as Filter<Record<string, unknown>>,
        { $unset: { role: "", staffSince: "" }, $set: { updatedAt: now } },
      );
    }
  }
}

function toStaff(row: BaUserDoc): StaffMember {
  const id = row.id ?? String(row._id);
  return {
    id,
    name: row.name ?? null,
    email: row.email,
    image: row.image ?? null,
    staffSince: row.staffSince ?? null,
    createdAt: row.createdAt,
  };
}
