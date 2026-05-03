/**
 * Curated reporting timezones (IANA tzdb identifiers).
 *
 * Keep the allowlist in sync with:
 *   api/src/common/constants/reporting-timezones.constants.ts
 *
 * Source: IANA Time Zone Database (public domain), identifiers as used by
 * Intl, PostgreSQL `AT TIME ZONE`, and JavaScript.
 * @see https://www.iana.org/time-zones
 */

export type ReportingTimezoneGroup = {
  label: string;
  zones: readonly { readonly id: string; readonly label: string }[];
};

export const REPORTING_TIMEZONE_GROUPS: readonly ReportingTimezoneGroup[] = [
  {
    label: "Indonesia & sekitar",
    zones: [
      { id: "Asia/Jakarta", label: "Jakarta / WIB" },
      { id: "Asia/Makassar", label: "Makassar / WITA" },
      { id: "Asia/Jayapura", label: "Jayapura / WIT" },
      { id: "Asia/Singapore", label: "Singapura" },
      { id: "Asia/Kuala_Lumpur", label: "Kuala Lumpur" },
      { id: "Asia/Bangkok", label: "Bangkok" },
      { id: "Asia/Manila", label: "Manila" },
      { id: "Asia/Ho_Chi_Minh", label: "Ho Chi Minh" },
      { id: "Asia/Phnom_Penh", label: "Phnom Penh" },
      { id: "Asia/Yangon", label: "Yangon" },
      { id: "Asia/Brunei", label: "Brunei" },
    ],
  },
  {
    label: "Asia Timur & Oceania",
    zones: [
      { id: "Asia/Hong_Kong", label: "Hong Kong" },
      { id: "Asia/Shanghai", label: "Shanghai" },
      { id: "Asia/Taipei", label: "Taipei" },
      { id: "Asia/Seoul", label: "Seoul" },
      { id: "Asia/Tokyo", label: "Tokyo" },
      { id: "Australia/Perth", label: "Perth" },
      { id: "Australia/Darwin", label: "Darwin" },
      { id: "Australia/Brisbane", label: "Brisbane" },
      { id: "Australia/Adelaide", label: "Adelaide" },
      { id: "Australia/Sydney", label: "Sydney" },
      { id: "Pacific/Auckland", label: "Auckland" },
      { id: "Pacific/Honolulu", label: "Honolulu" },
    ],
  },
  {
    label: "Asia Selatan & Timur Tengah",
    zones: [
      { id: "Asia/Kolkata", label: "India (Kolkata)" },
      { id: "Asia/Kathmandu", label: "Kathmandu" },
      { id: "Asia/Dhaka", label: "Dhaka" },
      { id: "Asia/Karachi", label: "Karachi" },
      { id: "Asia/Dubai", label: "Dubai" },
      { id: "Asia/Riyadh", label: "Riyadh" },
    ],
  },
  {
    label: "Amerika",
    zones: [
      { id: "America/Juneau", label: "Juneau (AK)" },
      { id: "America/Los_Angeles", label: "Los Angeles" },
      { id: "America/Denver", label: "Denver" },
      { id: "America/Chicago", label: "Chicago" },
      { id: "America/New_York", label: "New York" },
      { id: "America/Toronto", label: "Toronto" },
      { id: "America/Mexico_City", label: "Mexico City" },
      { id: "America/Sao_Paulo", label: "São Paulo" },
      { id: "America/Argentina/Buenos_Aires", label: "Buenos Aires" },
    ],
  },
  {
    label: "Eropa & Afrika",
    zones: [
      { id: "Atlantic/Reykjavik", label: "Reykjavík" },
      { id: "Europe/London", label: "London" },
      { id: "Europe/Paris", label: "Paris" },
      { id: "Europe/Berlin", label: "Berlin" },
      { id: "Europe/Athens", label: "Athens" },
      { id: "Africa/Lagos", label: "Lagos" },
      { id: "Africa/Johannesburg", label: "Johannesburg" },
    ],
  },
  {
    label: "Lainnya",
    zones: [{ id: "Etc/UTC", label: "UTC (tanpa offset musiman)" }],
  },
] as const;

/** Unique IANA ids (deduped). */
export const REPORTING_TIMEZONE_IDS: readonly string[] = Array.from(
  new Set(
    REPORTING_TIMEZONE_GROUPS.flatMap((g) => g.zones.map((z) => z.id)),
  ),
).sort();

const ID_SET = new Set(REPORTING_TIMEZONE_IDS);

export function isReportingTimezoneId(id: string): boolean {
  return ID_SET.has(id);
}

export function reportingTimezoneOptionById(
  id: string,
): { readonly id: string; readonly label: string } | undefined {
  for (const g of REPORTING_TIMEZONE_GROUPS) {
    const z = g.zones.find((x) => x.id === id);
    if (z) return z;
  }
  return undefined;
}

/** Same line as `SelectItem` — use on the trigger so the label shows when items are unmounted (portal). */
export function reportingTimezoneTriggerLabel(
  id: string,
  ref: Date = new Date(),
): string {
  const opt = reportingTimezoneOptionById(id);
  if (opt) return reportingTimezoneSelectLabel(opt.id, opt.label, ref);
  return id;
}

export const DEFAULT_REPORTING_TIMEZONE_UI = "Asia/Jakarta";

/**
 * UTC offset label for a zone at `ref` (handles DST where applicable), e.g. UTC+7.
 */
export function formatUtcOffsetLabel(
  timeZone: string,
  ref: Date = new Date(),
): string {
  try {
    let raw =
      new Intl.DateTimeFormat("en-US", {
        timeZone,
        timeZoneName: "shortOffset",
      })
        .formatToParts(ref)
        .find((p) => p.type === "timeZoneName")?.value ?? "";
    if (!raw) {
      raw =
        new Intl.DateTimeFormat("en-US", {
          timeZone,
          timeZoneName: "longOffset",
        })
          .formatToParts(ref)
          .find((p) => p.type === "timeZoneName")?.value ?? "";
    }
    if (!raw) return "";
    return raw
      .replace(/^GMT/i, "UTC")
      .replace(/\u2212/g, "-")
      .replace(/\s+/g, "")
      .trim();
  } catch {
    return "";
  }
}

/** One line for SelectItem: city + offset + IANA (small). */
export function reportingTimezoneSelectLabel(
  id: string,
  cityLabel: string,
  ref: Date = new Date(),
): string {
  const off = formatUtcOffsetLabel(id, ref);
  return off ? `${cityLabel} · ${off}` : `${cityLabel} (${id})`;
}
