import type { EventPerson, UpsertEventPersonBody } from "@/lib/api/events";
import { normalizeMealNotes, personTypeToRole, roleUsesTherapies } from "@/lib/events-staff";

/** Peran UI → `personType` api-go. */
export const ROLE_TO_PERSON_TYPE: Record<string, string> = {
  terapis: "THERAPIST",
  relawan: "VOLUNTEER",
  shijie: "SHIJIE",
  daoshi: "DAOSHI",
  fashi: "FASHI",
};

export type StaffForm = {
  rosterId: string;
  fullName: string;
  role: string;
  attendanceStatus: string;
  therapyIds: string[];
  volunteerRoleId: string;
  isPencatat: boolean;
  countsTowardMeals: boolean;
  mealNotes: string;
  saveToRoster: boolean;
  notes: string;
  arrivalTime: string;
  departureTime: string;
  availableFrom: string;
  availableUntil: string;
};

export const emptyStaffForm = (): StaffForm => ({
  rosterId: "",
  fullName: "",
  role: "terapis",
  attendanceStatus: "PRESENT",
  therapyIds: [],
  volunteerRoleId: "",
  isPencatat: false,
  countsTowardMeals: true,
  mealNotes: "",
  saveToRoster: true,
  notes: "",
  arrivalTime: "",
  departureTime: "",
  availableFrom: "",
  availableUntil: "",
});

/** Prefill dialog Edit dari baris list person (list api-go memuat semua field yang dibutuhkan). */
export function personToStaffForm(p: EventPerson): StaffForm {
  return {
    rosterId: "",
    fullName: p.fullName,
    role: p.role ?? personTypeToRole(p.personType),
    attendanceStatus: p.attendanceStatus || "PRESENT",
    therapyIds: p.therapyIds ?? (p.therapyId ? [p.therapyId] : []),
    volunteerRoleId: p.volunteerRoleId ?? "",
    isPencatat: p.isPencatat ?? false,
    countsTowardMeals: p.countsTowardMeals ?? true,
    mealNotes: p.mealNotes ?? "",
    saveToRoster: true,
    notes: p.notes ?? "",
    arrivalTime: p.arrivalTime?.slice(0, 5) ?? "",
    departureTime: p.departureTime?.slice(0, 5) ?? "",
    availableFrom: p.availableFrom?.slice(0, 5) ?? "",
    availableUntil: p.availableUntil?.slice(0, 5) ?? "",
  };
}

/** Jam kosong → null (api-go menyimpan NULL), selain itu dikirim apa adanya. */
const timeOrNull = (v: string): string | null => (v.trim() ? v.trim() : null);

/**
 * Payload `POST` (tambah) person — field yang tidak relevan untuk peran dihilangkan.
 */
export function buildCreatePersonPayload(form: StaffForm): UpsertEventPersonBody {
  const mealNotes = normalizeMealNotes(form.countsTowardMeals, form.mealNotes);
  return {
    rosterId: form.rosterId || undefined,
    saveToRoster: form.saveToRoster,
    fullName: form.fullName,
    role: form.role,
    attendanceStatus: form.attendanceStatus,
    therapyIds: roleUsesTherapies(form.role) ? form.therapyIds : undefined,
    volunteerRoleId: form.role === "relawan" ? form.volunteerRoleId || undefined : undefined,
    isPencatat: form.role === "relawan" ? form.isPencatat : undefined,
    countsTowardMeals: form.countsTowardMeals,
    mealNotes: mealNotes || undefined,
    arrivalTime: form.arrivalTime || undefined,
    departureTime: form.departureTime || undefined,
    availableFrom: form.availableFrom || undefined,
    availableUntil: form.availableUntil || undefined,
  };
}

/**
 * Payload `PUT` (edit) person. api-go melakukan FULL REPLACE semua field (termasuk sync
 * terapi + ketersediaan dan peran relawan + pencatat): field yang tidak dikirim menjadi NULL/kosong
 * dan `countsTowardMeals` default TRUE. Karena itu SEMUA nilai form dikirim untuk semua peran —
 * termasuk field yang disembunyikan untuk peran tersebut — sehingga hanya field yang diubah user
 * yang berbeda dari data asal.
 */
export function buildUpdatePersonPayload(form: StaffForm): UpsertEventPersonBody {
  return {
    saveToRoster: form.saveToRoster,
    fullName: form.fullName,
    role: form.role,
    personType: ROLE_TO_PERSON_TYPE[form.role],
    attendanceStatus: form.attendanceStatus,
    arrivalTime: timeOrNull(form.arrivalTime),
    departureTime: timeOrNull(form.departureTime),
    notes: form.notes,
    countsTowardMeals: form.countsTowardMeals,
    mealNotes: normalizeMealNotes(form.countsTowardMeals, form.mealNotes),
    therapyIds: form.therapyIds,
    availableFrom: timeOrNull(form.availableFrom),
    availableUntil: timeOrNull(form.availableUntil),
    volunteerRoleId: form.volunteerRoleId || null,
    isPencatat: form.isPencatat,
  };
}
