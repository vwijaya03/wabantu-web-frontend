const ID_MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

/** ISO date → "1 Januari 1945" */
export function formatEventDateId(value: string | null | undefined): string {
  const raw = (value ?? "").trim();
  if (!raw) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (!m) return raw;
  const day = parseInt(m[3], 10);
  const month = parseInt(m[2], 10);
  const year = parseInt(m[1], 10);
  if (month < 1 || month > 12) return raw;
  return `${day} ${ID_MONTHS[month - 1]} ${year}`;
}

export function formatEventTimeHm(value: string | null | undefined): string {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  return raw.length >= 5 ? raw.slice(0, 5) : raw;
}

/** Slot label from API or parts → "14 Juni 2026 09:00–09:30" */
export function formatPatientSlotLabel(
  slotLabel?: string | null,
  slotDate?: string,
  startTime?: string,
  endTime?: string,
): string {
  if (slotLabel?.trim()) {
    const iso = /^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})(?::\d{2})?(?:\s*[–-]\s*(\d{2}:\d{2})(?::\d{2})?)?/.exec(
      slotLabel.trim(),
    );
    if (iso) {
      return formatPatientSlotLabel(null, iso[1], iso[2], iso[3]);
    }
    if (!/^\d{4}-\d{2}-\d{2}/.test(slotLabel)) {
      return slotLabel;
    }
  }
  const date = (slotDate ?? "").trim();
  if (!date) return slotLabel?.trim() || "—";
  const start = formatEventTimeHm(startTime);
  const end = formatEventTimeHm(endTime);
  const datePart = formatEventDateId(date);
  if (!start) return datePart;
  if (end && end !== start) return `${datePart} ${start}–${end}`;
  return `${datePart} ${start}`;
}

/** Schedule row title: "Nama — Terapi (14 Juni 2026 09:00–09:30)" */
export function formatScheduledPatientLine(
  fullName: string,
  therapyName?: string,
  slotLabel?: string,
): string {
  const therapy = therapyName?.trim() || "—";
  const slot = slotLabel?.trim();
  return slot ? `${fullName} — ${therapy} (${slot})` : `${fullName} — ${therapy}`;
}

/** Time slot row: "14 Juni 2026 09:00–09:30 (Terapi …)" */
export function formatTimeSlotLine(
  slotDate: string,
  startTime: string,
  endTime: string,
  therapyName?: string,
  booked?: number,
  capacity?: number,
): string {
  const when = formatPatientSlotLabel(null, slotDate, startTime, endTime);
  const therapy = therapyName ? ` (${therapyName})` : "";
  const cap =
    booked != null && capacity != null ? ` · ${booked}/${capacity} pasien` : "";
  return `${when}${therapy}${cap}`;
}
