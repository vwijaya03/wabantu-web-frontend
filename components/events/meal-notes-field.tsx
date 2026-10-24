"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MEAL_NOTES_MAX_LENGTH } from "@/lib/events-staff";
import { useLocale } from "@/lib/i18n/locale";

/** Field "Catatan konsumsi (opsional)" — tampil hanya saat orang dihitung untuk konsumsi. */
export function MealNotesField({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useLocale();
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{t("Catatan konsumsi (opsional)")}</Label>
      <Input
        id={id}
        value={value}
        maxLength={MEAL_NOTES_MAX_LENGTH}
        placeholder={t("Contoh: nasi setengah, tanpa nasi, alergi udang")}
        onChange={(e) => onChange(e.target.value.slice(0, MEAL_NOTES_MAX_LENGTH))}
        aria-describedby={`${id}-counter`}
      />
      <p id={`${id}-counter`} className="text-right text-xs text-muted-foreground" aria-live="polite">
        {value.length}/{MEAL_NOTES_MAX_LENGTH}
      </p>
    </div>
  );
}
