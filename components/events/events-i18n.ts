"use client";

import { useMemo } from "react";

import { useDateFnsLocale, useLocale } from "@/lib/i18n/locale";
import type { SortOption } from "@/lib/events-sort";
import {
  formatEventDateId,
  formatEventDateIdWithWeekday,
  formatEventDateTimeRange,
  formatPatientSlotLabel,
  formatTimeSlotLine,
} from "@/lib/events-format";

export function useEventDateFormat() {
  const dateFnsLocale = useDateFnsLocale();
  const { t, locale } = useLocale();
  const patientNoun = t("pasien");

  return useMemo(
    () => ({
      locale,
      formatEventDateId: (value: string | null | undefined) =>
        formatEventDateId(value, dateFnsLocale),
      formatEventDateIdWithWeekday: (value: string | null | undefined) =>
        formatEventDateIdWithWeekday(value, dateFnsLocale),
      formatEventDateTimeRange: (
        startDate?: string | null,
        startTime?: string | null,
        endDate?: string | null,
        endTime?: string | null,
      ) => formatEventDateTimeRange(startDate, startTime, endDate, endTime, dateFnsLocale),
      formatPatientSlotLabel: (
        slotLabel?: string | null,
        slotDate?: string,
        startTime?: string,
        endTime?: string,
      ) => formatPatientSlotLabel(slotLabel, slotDate, startTime, endTime, dateFnsLocale),
      formatTimeSlotLine: (
        slotDate: string,
        startTime: string,
        endTime: string,
        therapyName?: string,
        booked?: number,
        capacity?: number,
      ) =>
        formatTimeSlotLine(
          slotDate,
          startTime,
          endTime,
          therapyName,
          booked,
          capacity,
          dateFnsLocale,
          patientNoun,
        ),
    }),
    [dateFnsLocale, locale, patientNoun],
  );
}

export function useTranslatedSortOptions(options: SortOption[]): SortOption[] {
  const { t } = useLocale();
  return useMemo(() => options.map((o) => ({ ...o, label: t(o.label) })), [options, t]);
}
