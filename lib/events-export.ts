/** Kolom opsional export pasien (No & Nama selalu ikut). */
export const PATIENT_EXPORT_OPTIONAL_COLUMNS = [
  { key: "birthDate", label: "Tgl lahir" },
  { key: "therapy", label: "Terapi" },
  { key: "complaint", label: "Keluhan" },
  { key: "preferredTime", label: "Jam preferensi" },
  { key: "status", label: "Status" },
  { key: "slot", label: "Jadwal slot" },
] as const;

export type PatientExportColumnKey = (typeof PATIENT_EXPORT_OPTIONAL_COLUMNS)[number]["key"];

export const DEFAULT_HIDDEN_PATIENT_EXPORT_COLUMNS: PatientExportColumnKey[] = ["status"];
