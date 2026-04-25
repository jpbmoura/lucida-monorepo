export interface StaffMember {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  staffSince: string | null; // ISO
  createdAt: string; // ISO
}

export interface ListStaffResponse {
  staff: StaffMember[];
}

export interface PromoteStaffResponse {
  member: StaffMember;
}

// Resultado das server actions. Usar discriminated union torna o ui
// tratável em 1 branch por estado — evita acumular `error?: string`.
export type StaffActionResult =
  | { ok: true }
  | {
      ok: false;
      code:
        | "USER_NOT_FOUND"
        | "ALREADY_STAFF"
        | "CANNOT_REVOKE_SELF"
        | "VALIDATION_ERROR"
        | "UNKNOWN";
      message: string;
    };
