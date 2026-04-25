import "server-only";
import { apiFetch } from "@/lib/api-client";

export interface UserProfileDTO {
  id: string;
  email: string;
  name: string;
  image: string | null;
  activeOrganizationId: string | null;
  whatsapp: string;
  institutionType: string | null;
  gender: string | null;
  teachingLevels: string[];
  subjects: string[];
  acquisitionChannel: string | null;
  stateUf: string | null;
  studentsRange: string | null;
  teachingYears: string | null;
}

export async function fetchUserProfile(): Promise<UserProfileDTO> {
  const res = await apiFetch<{ data: UserProfileDTO }>("/v1/me");
  return res.data;
}

const PROFILE_FIELDS: Array<keyof UserProfileDTO> = [
  "name",
  "whatsapp",
  "institutionType",
  "gender",
  "teachingLevels",
  "subjects",
  "acquisitionChannel",
  "stateUf",
  "studentsRange",
  "teachingYears",
];

export function computeCompleteness(profile: UserProfileDTO): number {
  const filled = PROFILE_FIELDS.filter((k) => {
    const v = profile[k];
    if (Array.isArray(v)) return v.length > 0;
    return typeof v === "string" && v.trim() !== "";
  }).length;
  return Math.round((filled / PROFILE_FIELDS.length) * 100);
}
