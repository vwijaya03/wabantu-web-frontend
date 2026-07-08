"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatTimeValue, parseTimeValue } from "@/lib/date-format";
import { cn } from "@/lib/utils";

export type TimePickerProps = {
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
  minuteStep?: number;
  id?: string;
};

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));

function minutesForStep(step: number): string[] {
  const items: string[] = [];
  for (let m = 0; m < 60; m += step) {
    items.push(String(m).padStart(2, "0"));
  }
  return items;
}

export function TimePicker({
  value = "",
  onChange,
  disabled,
  className,
  minuteStep = 1,
  id,
}: TimePickerProps) {
  const parsed = parseTimeValue(value);
  const minutes = minutesForStep(minuteStep);

  return (
    <div id={id} className={cn("grid grid-cols-2 gap-2", className)}>
      <Select
        disabled={disabled}
        value={parsed?.hour ?? ""}
        onValueChange={(hour) => {
          onChange?.(formatTimeValue(hour, parsed?.minute ?? "00"));
        }}
      >
        <SelectTrigger aria-label="Jam">
          <SelectValue placeholder="Jam" />
        </SelectTrigger>
        <SelectContent>
          {HOURS.map((h) => (
            <SelectItem key={h} value={h}>
              {h}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        disabled={disabled}
        value={parsed?.minute ?? ""}
        onValueChange={(minute) => {
          onChange?.(formatTimeValue(parsed?.hour ?? "00", minute));
        }}
      >
        <SelectTrigger aria-label="Menit">
          <SelectValue placeholder="Menit" />
        </SelectTrigger>
        <SelectContent>
          {minutes.map((m) => (
            <SelectItem key={m} value={m}>
              {m}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
