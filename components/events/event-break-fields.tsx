"use client";

import { TimePicker } from "@/components/ui/time-picker";
import { Label } from "@/components/ui/label";
import { useLocale } from "@/lib/i18n/locale";

export function EventBreakFields({
  enabled,
  breakStartTime,
  breakEndTime,
  onEnabledChange,
  onBreakStartChange,
  onBreakEndChange,
  disabled,
}: {
  enabled: boolean;
  breakStartTime: string;
  breakEndTime: string;
  onEnabledChange: (enabled: boolean) => void;
  onBreakStartChange: (value: string) => void;
  onBreakEndChange: (value: string) => void;
  disabled?: boolean;
}) {
  const { t } = useLocale();

  return (
    <div className="space-y-2 rounded-md border bg-muted/30 p-3">
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={enabled}
          disabled={disabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
        />
        {t("Ada jeda istirahat")}
      </label>
      <p className="text-xs text-muted-foreground">
        {t(
          "Slot otomatis tidak dibuat di jam ini. Berlaku untuk semua terapi mode rentang jam (otomatis).",
        )}
      </p>
      {enabled ? (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">{t("Mulai jeda")}</Label>
            <TimePicker
              disabled={disabled}
              value={breakStartTime}
              onChange={onBreakStartChange}
            />
          </div>
          <div>
            <Label className="text-xs">{t("Lanjut kegiatan")}</Label>
            <TimePicker
              disabled={disabled}
              value={breakEndTime}
              onChange={onBreakEndChange}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
