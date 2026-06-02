/** Peran staf yang memakai penugasan terapi (termasuk shijie, daoshi, fashi). */
export const THERAPY_STAFF_ROLES = ["terapis", "shijie", "daoshi", "fashi"] as const;

export type TherapyStaffRole = (typeof THERAPY_STAFF_ROLES)[number];

export function roleUsesTherapies(role: string): boolean {
  return (THERAPY_STAFF_ROLES as readonly string[]).includes(role.toLowerCase());
}

export function personTypeToRole(personType: string): string {
  const m: Record<string, string> = {
    THERAPIST: "terapis",
    VOLUNTEER: "relawan",
    SHIJIE: "shijie",
    DAOSHI: "daoshi",
    FASHI: "fashi",
  };
  return m[personType] ?? "terapis";
}

export const STAFF_ROLES = [
  { value: "terapis", label: "Terapis" },
  { value: "shijie", label: "Shijie" },
  { value: "daoshi", label: "Daoshi" },
  { value: "fashi", label: "Fashi" },
  { value: "relawan", label: "Relawan" },
] as const;

export function staffRoleLabel(role: string): string {
  return STAFF_ROLES.find((r) => r.value === role)?.label ?? role;
}
