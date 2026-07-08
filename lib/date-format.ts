import { format, isValid, parse } from "date-fns";

/** `YYYY-MM-DD` — same as HTML `input[type=date].value`. */
export function formatDateValue(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function parseDateValue(s: string): Date | undefined {
  const trimmed = s.trim();
  if (!trimmed) return undefined;
  const d = parse(trimmed, "yyyy-MM-dd", new Date());
  return isValid(d) ? d : undefined;
}

/** Parses `HH:mm` or `HH:mm:ss`. */
export function parseTimeValue(s: string): { hour: string; minute: string } | undefined {
  const trimmed = s.trim();
  if (!trimmed) return undefined;
  const parts = trimmed.split(":");
  if (parts.length < 2) return undefined;
  const hour = parts[0].padStart(2, "0");
  const minute = parts[1].padStart(2, "0");
  if (!/^\d{2}$/.test(hour) || !/^\d{2}$/.test(minute)) return undefined;
  const h = Number(hour);
  const m = Number(minute);
  if (h < 0 || h > 23 || m < 0 || m > 59) return undefined;
  return { hour, minute };
}

/** `HH:mm` — backend accepts `15:04` and `15:04:05`. */
export function formatTimeValue(hour: string, minute: string): string {
  return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
}

export function formatTimeDisplay(s: string): string {
  const p = parseTimeValue(s);
  if (!p) return s;
  return `${p.hour}:${p.minute}`;
}

const BIRTH_DATE_DD_MM_YYYY = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

/** Strip non-digits and format as DD/MM/YYYY while typing (max 8 digits). */
export function formatBirthDateInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** Parse `D/M/YYYY` or `DD/MM/YYYY` → `YYYY-MM-DD`, or `null` if invalid. */
export function parseBirthDateDdMmYyyy(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const m = BIRTH_DATE_DD_MM_YYYY.exec(trimmed);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || year < 1000 || year > 9999) return null;
  const d = new Date(year, month - 1, day);
  if (
    d.getFullYear() !== year ||
    d.getMonth() !== month - 1 ||
    d.getDate() !== day
  ) {
    return null;
  }
  return format(d, "yyyy-MM-dd");
}
