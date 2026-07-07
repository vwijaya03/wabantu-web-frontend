"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  return (
    <div className="space-y-2 rounded-md border bg-muted/30 p-3">
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={enabled}
          disabled={disabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
        />
        Ada jeda istirahat
      </label>
      <p className="text-xs text-muted-foreground">
        Slot otomatis tidak dibuat di jam ini. Berlaku untuk semua terapi mode rentang jam (otomatis).
      </p>
      {enabled ? (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Mulai jeda</Label>
            <Input
              type="time"
              disabled={disabled}
              value={breakStartTime}
              onChange={(e) => onBreakStartChange(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Lanjut kegiatan</Label>
            <Input
              type="time"
              disabled={disabled}
              value={breakEndTime}
              onChange={(e) => onBreakEndChange(e.target.value)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
