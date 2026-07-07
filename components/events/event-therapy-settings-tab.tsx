"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { eventsApi, type EventTherapySetting, type TherapySlotTemplate } from "@/lib/api/events";
import { toApiError } from "@/lib/api/client";
import { toast } from "sonner";

const CAPACITY_MODES = ["THERAPIST_COUNT", "SHIJIE_COUNT", "FIXED"] as const;

const CAPACITY_MODE_LABELS: Record<(typeof CAPACITY_MODES)[number], string> = {
  THERAPIST_COUNT: "Jumlah terapis (per terapi)",
  SHIJIE_COUNT: "Jumlah Shijie di acara",
  FIXED: "Angka tetap",
};

function defaultScheduleMode(therapyName?: string) {
  if (therapyName?.toLowerCase().includes("5 elemen")) return "MANUAL";
  return "AUTO";
}

function emptySlotRow(order: number): TherapySlotTemplate {
  return { startTime: "", endTime: "", capacity: 1, sortOrder: order };
}

function initialSlots(setting: EventTherapySetting): TherapySlotTemplate[] {
  const t = setting.slotTemplates ?? [];
  if (t.length > 0) return t.map((s, i) => ({ ...s, capacity: s.capacity ?? 1, sortOrder: s.sortOrder ?? i }));
  if ((setting.scheduleMode || defaultScheduleMode(setting.therapyName)) === "MANUAL") {
    return [emptySlotRow(0)];
  }
  return [];
}

/** Remount form when server setting changes (e.g. after save + refetch). */
function therapySettingFormKey(setting: EventTherapySetting): string {
  return [
    setting.id,
    setting.slotDurationMinutes,
    setting.capacityMode,
    setting.scheduleMode,
    setting.maxCapacity ?? "",
    setting.scheduleStartTime ?? "",
    setting.scheduleEndTime ?? "",
    JSON.stringify(setting.slotTemplates ?? []),
  ].join("|");
}

function TherapySettingCard({
  setting,
  eventId,
  disabled,
  eventBreak,
  onSaved,
}: {
  setting: EventTherapySetting;
  eventId: string;
  disabled: boolean;
  eventBreak?: { start: string; end: string };
  onSaved: () => void;
}) {
  const [dur, setDur] = useState(String(setting.slotDurationMinutes));
  const [mode, setMode] = useState(setting.capacityMode);
  const [maxCap, setMaxCap] = useState(setting.maxCapacity != null ? String(setting.maxCapacity) : "");
  const [schedMode, setSchedMode] = useState(
    setting.scheduleMode || defaultScheduleMode(setting.therapyName),
  );
  const [schedStart, setSchedStart] = useState(setting.scheduleStartTime?.slice(0, 5) ?? "");
  const [schedEnd, setSchedEnd] = useState(setting.scheduleEndTime?.slice(0, 5) ?? "");
  const [slots, setSlots] = useState<TherapySlotTemplate[]>(() => initialSlots(setting));
  const [saving, setSaving] = useState(false);

  const isManual = schedMode === "MANUAL";
  const isFixedCapacity = mode === "FIXED";
  const manualCapacitySum = slots.reduce((sum, s) => sum + (s.capacity && s.capacity > 0 ? s.capacity : 1), 0);

  const save = async () => {
    setSaving(true);
    try {
      await eventsApi.upsertEventTherapy(eventId, {
        therapyId: setting.therapyId,
        slotDurationMinutes: parseInt(dur, 10) || 30,
        capacityMode: mode,
        maxCapacity: isFixedCapacity
          ? isManual
            ? manualCapacitySum
            : maxCap
              ? parseInt(maxCap, 10)
              : undefined
          : undefined,
        scheduleMode: schedMode,
        scheduleStartTime: !isManual && schedStart ? schedStart : undefined,
        scheduleEndTime: !isManual && schedEnd ? schedEnd : undefined,
        slotTemplates: isManual
          ? slots.map((s, i) => ({
              startTime: s.startTime,
              endTime: s.endTime,
              capacity: isFixedCapacity ? (s.capacity && s.capacity > 0 ? s.capacity : 1) : undefined,
              sortOrder: i,
            }))
          : undefined,
      });
      toast.success("Pengaturan disimpan");
      onSaved();
    } catch (e) {
      toast.error(toApiError(e).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{setting.therapyName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-3">
          <div>
            <Label>Mode kapasitas</Label>
            <Select value={mode} disabled={disabled} onValueChange={setMode}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CAPACITY_MODES.map((m) => (
                  <SelectItem key={m} value={m}>
                    {CAPACITY_MODE_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!isFixedCapacity ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {mode === "THERAPIST_COUNT"
                  ? "Kapasitas per jam = banyaknya staf (terapis/daoshi/fashi) yang terikat terapi ini & dianggap hadir. Bukan dari angka Max di bawah."
                  : "Kapasitas per jam = jumlah Shijie hadir di acara ini."}
              </p>
            ) : null}
          </div>
          {isFixedCapacity ? (
            <div>
              <Label>{isManual ? "Total kapasitas slot manual (otomatis)" : "Kapasitas per slot (tetap)"}</Label>
              <Input
                type="number"
                min={1}
                value={isManual ? String(Math.max(1, manualCapacitySum)) : maxCap}
                disabled={disabled || isManual}
                onChange={(e) => setMaxCap(e.target.value)}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {isManual
                  ? "Otomatis dijumlah dari kapasitas tiap slot di daftar manual."
                  : "Mis. 5 -> setiap jam slot bisa maks. 5 pasien (0/5, 1/5, ...)."}
              </p>
            </div>
          ) : (
            <div className="hidden md:block" aria-hidden />
          )}
          <div>
            <Label>Mode jadwal slot</Label>
            <Select value={schedMode} disabled={disabled} onValueChange={setSchedMode}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AUTO">Rentang jam (otomatis)</SelectItem>
                <SelectItem value="MANUAL">Daftar slot manual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isManual ? (
          <div className="space-y-2 rounded-md border p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">Slot per hari (diulang setiap hari acara)</p>
              {!disabled ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setSlots((prev) => [...prev, emptySlotRow(prev.length)])}
                >
                  <Plus className="mr-1 h-4 w-4" /> Tambah slot
                </Button>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              Tentukan setiap rentang waktu sendiri (mis. jeda istirahat 10:30–13:00 cukup tidak ditambahkan).
            </p>
            {slots.map((slot, idx) => (
              <div key={idx} className="flex flex-wrap items-end gap-2">
                <span className="w-14 text-xs text-muted-foreground">Slot {idx + 1}</span>
                <div>
                  <Label className="text-xs">Mulai</Label>
                  <Input
                    type="time"
                    className="w-32"
                    disabled={disabled}
                    value={slot.startTime?.slice(0, 5) ?? ""}
                    onChange={(e) =>
                      setSlots((prev) =>
                        prev.map((s, i) => (i === idx ? { ...s, startTime: e.target.value } : s)),
                      )
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Selesai</Label>
                  <Input
                    type="time"
                    className="w-32"
                    disabled={disabled}
                    value={slot.endTime?.slice(0, 5) ?? ""}
                    onChange={(e) =>
                      setSlots((prev) =>
                        prev.map((s, i) => (i === idx ? { ...s, endTime: e.target.value } : s)),
                      )
                    }
                  />
                </div>
                {isFixedCapacity ? (
                  <div>
                    <Label className="text-xs">Kapasitas</Label>
                    <Input
                      type="number"
                      min={1}
                      className="w-24"
                      disabled={disabled}
                      value={slot.capacity ?? 1}
                      onChange={(e) =>
                        setSlots((prev) =>
                          prev.map((s, i) =>
                            i === idx ? { ...s, capacity: Math.max(1, parseInt(e.target.value || "1", 10) || 1) } : s,
                          ),
                        )
                      }
                    />
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    Kapasitas mengikuti mode otomatis.
                  </div>
                )}
                {!disabled && slots.length > 1 ? (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => setSlots((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-2 md:grid-cols-3">
            <div>
              <Label>Durasi slot (menit)</Label>
              <Input type="number" value={dur} disabled={disabled} onChange={(e) => setDur(e.target.value)} />
            </div>
            <div>
              <Label>Jam mulai jadwal</Label>
              <Input type="time" value={schedStart} disabled={disabled} onChange={(e) => setSchedStart(e.target.value)} />
            </div>
            <div>
              <Label>Jam selesai jadwal</Label>
              <Input type="time" value={schedEnd} disabled={disabled} onChange={(e) => setSchedEnd(e.target.value)} />
            </div>
            <p className="md:col-span-3 text-xs text-muted-foreground">
              Slot dibagi otomatis dari jam mulai sampai selesai sesuai durasi. Cocok untuk Terapi Shijie dan
              Terapi Energi Dewa.
            </p>
            {eventBreak ? (
              <p className="md:col-span-3 text-xs text-amber-800 dark:text-amber-200">
                Jeda acara: {eventBreak.start}–{eventBreak.end} (slot tidak dibuat di jam ini).
              </p>
            ) : null}
          </div>
        )}

        {disabled ? null : (
          <Button disabled={saving} onClick={() => void save()}>
            Simpan
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function EventTherapySettingsTab({
  eventId,
  canEdit,
  settings,
  eventBreak,
  onSaved,
}: {
  eventId: string;
  canEdit: boolean;
  settings: EventTherapySetting[];
  eventBreak?: { start: string; end: string };
  onSaved: () => void;
}) {
  return (
    <div className="mt-4 space-y-4">
      <p className="text-sm text-muted-foreground">
        Terapi 5 Elemen: gunakan <strong>daftar slot manual</strong>. Terapi Shijie / Energi Dewa: gunakan{" "}
        <strong>rentang jam otomatis</strong>. Setelah disimpan, generate slot di tab Jadwal.
      </p>
      {settings.map((s) => (
        <TherapySettingCard
          key={therapySettingFormKey(s)}
          setting={s}
          eventId={eventId}
          disabled={!canEdit}
          eventBreak={eventBreak}
          onSaved={onSaved}
        />
      ))}
    </div>
  );
}
