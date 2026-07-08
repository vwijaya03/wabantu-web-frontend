export type SortDir = "asc" | "desc";

export type SortOption = { value: string; label: string };

export type ListSortState = { sortBy: string; sortDir: SortDir };

export const EVENT_LIST_SORT_OPTIONS: SortOption[] = [
  { value: "startDate", label: "Tanggal acara" },
  { value: "eventName", label: "Nama acara" },
  { value: "status", label: "Status" },
  { value: "createdAt", label: "Dibuat" },
];

export const EVENT_LIST_SORT_DEFAULT: ListSortState = { sortBy: "startDate", sortDir: "desc" };

export const PATIENT_SORT_OPTIONS: SortOption[] = [
  { value: "therapy", label: "Terapi" },
  { value: "name", label: "Nama" },
  { value: "slotDate", label: "Tanggal slot" },
  { value: "slotTime", label: "Jam slot" },
  { value: "status", label: "Status" },
  { value: "createdAt", label: "Terdaftar" },
];

export const PATIENT_SORT_DEFAULT: ListSortState = { sortBy: "therapy", sortDir: "asc" };

export const STAFF_SORT_OPTIONS: SortOption[] = [
  { value: "personType", label: "Peran" },
  { value: "name", label: "Nama" },
  { value: "createdAt", label: "Ditambahkan" },
];

export const STAFF_SORT_DEFAULT: ListSortState = { sortBy: "personType", sortDir: "asc" };

export const ASSIGNMENT_SORT_OPTIONS: SortOption[] = [
  { value: "startTime", label: "Jam mulai" },
  { value: "taskName", label: "Tugas" },
  { value: "personName", label: "Nama staf" },
  { value: "createdAt", label: "Ditambahkan" },
];

export const ASSIGNMENT_SORT_DEFAULT: ListSortState = { sortBy: "startTime", sortDir: "asc" };

export const SCHEDULE_SLOT_SORT_OPTIONS: SortOption[] = [
  { value: "startTime", label: "Jam mulai" },
  { value: "capacity", label: "Kapasitas" },
];

export const SCHEDULE_SLOT_SORT_DEFAULT: ListSortState = { sortBy: "startTime", sortDir: "asc" };

export const SCHEDULE_PATIENT_SORT_OPTIONS: SortOption[] = [
  { value: "slotTime", label: "Jam slot" },
  { value: "name", label: "Nama" },
  { value: "status", label: "Status" },
];

export const SCHEDULE_PATIENT_SORT_DEFAULT: ListSortState = { sortBy: "slotTime", sortDir: "asc" };

export const STAFF_EXPORT_SORT_OPTIONS: SortOption[] = [
  { value: "personType", label: "Peran" },
  { value: "name", label: "Nama" },
];

export const STAFF_EXPORT_SORT_DEFAULT: ListSortState = { sortBy: "personType", sortDir: "asc" };

/** Client-side sort for schedule tab (dataset per filter). */
export function sortScheduleSlots<T extends { startTime: string; capacity?: number }>(
  items: T[],
  sort: ListSortState,
): T[] {
  const out = [...items];
  const desc = sort.sortDir === "desc";
  out.sort((a, b) => {
    if (sort.sortBy === "capacity") {
      const av = a.capacity ?? 0;
      const bv = b.capacity ?? 0;
      return desc ? bv - av : av - bv;
    }
    const av = a.startTime ?? "";
    const bv = b.startTime ?? "";
    if (av === bv) return 0;
    return desc ? (av < bv ? 1 : -1) : av < bv ? -1 : 1;
  });
  return out;
}

export function sortSchedulePatients<T extends { fullName: string; reservationStatus: string; slotLabel?: string }>(
  items: T[],
  sort: ListSortState,
): T[] {
  const out = [...items];
  const desc = sort.sortDir === "desc";
  out.sort((a, b) => {
    let av = "";
    let bv = "";
    if (sort.sortBy === "name") {
      av = a.fullName.toLowerCase();
      bv = b.fullName.toLowerCase();
    } else if (sort.sortBy === "status") {
      av = a.reservationStatus;
      bv = b.reservationStatus;
    } else {
      av = a.slotLabel ?? "";
      bv = b.slotLabel ?? "";
    }
    if (av === bv) return 0;
    return desc ? (av < bv ? 1 : -1) : av < bv ? -1 : 1;
  });
  return out;
}
