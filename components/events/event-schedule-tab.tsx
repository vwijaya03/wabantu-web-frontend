"use client";

import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Patient, TimeSlot } from "@/lib/api/events";
import {
  formatEventDateId,
  formatPatientSlotLabel,
  formatTimeSlotLine,
} from "@/lib/events-format";
import { ListSortControl } from "@/components/events/list-sort-control";
import {
  SCHEDULE_PATIENT_SORT_DEFAULT,
  SCHEDULE_PATIENT_SORT_OPTIONS,
  SCHEDULE_SLOT_SORT_DEFAULT,
  SCHEDULE_SLOT_SORT_OPTIONS,
  sortSchedulePatients,
  sortScheduleSlots,
} from "@/lib/events-sort";

type ScheduleColumn = "birthDate" | "complaint" | "preferredTime" | "status";

const COLUMN_LABELS: Record<ScheduleColumn, string> = {
  birthDate: "Tgl lahir",
  complaint: "Keluhan",
  preferredTime: "Jam preferensi",
  status: "Status",
};

export function EventScheduleTab({
  canEdit,
  therapies,
  scheduleTherapy,
  onScheduleTherapyChange,
  scheduleDate,
  onScheduleDateChange,
  slots,
  patients,
  selectedSlotIds,
  onSelectedSlotIdsChange,
  onGenerateSlots,
  onDeleteSlot,
  onDeleteSlotsBulk,
  genSlotsPending,
  deleteSlotPending,
  deleteBulkPending,
}: {
  canEdit: boolean;
  therapies: { id: string; therapyName: string }[];
  scheduleTherapy: string;
  onScheduleTherapyChange: (v: string) => void;
  scheduleDate: string;
  onScheduleDateChange: (v: string) => void;
  slots: TimeSlot[];
  patients: Patient[];
  selectedSlotIds: string[];
  onSelectedSlotIdsChange: (ids: string[]) => void;
  onGenerateSlots: (therapyId: string) => void;
  onDeleteSlot: (slotId: string) => void;
  onDeleteSlotsBulk: (slotIds: string[]) => void;
  genSlotsPending: boolean;
  deleteSlotPending: boolean;
  deleteBulkPending: boolean;
}) {
  const [hiddenCols, setHiddenCols] = useState<Set<ScheduleColumn>>(new Set());
  const [slotSort, setSlotSort] = useState(SCHEDULE_SLOT_SORT_DEFAULT);
  const [patientSort, setPatientSort] = useState(SCHEDULE_PATIENT_SORT_DEFAULT);

  const sortedSlots = useMemo(() => sortScheduleSlots(slots, slotSort), [slots, slotSort]);
  const sortedPatients = useMemo(
    () => sortSchedulePatients(patients, patientSort),
    [patients, patientSort],
  );

  const visibleCols = useMemo(
    () => (Object.keys(COLUMN_LABELS) as ScheduleColumn[]).filter((c) => !hiddenCols.has(c)),
    [hiddenCols],
  );

  const toggleCol = (col: ScheduleColumn) => {
    setHiddenCols((prev) => {
      const next = new Set(prev);
      if (next.has(col)) next.delete(col);
      else next.add(col);
      return next;
    });
  };

  const allSlotsSelected = sortedSlots.length > 0 && selectedSlotIds.length === sortedSlots.length;

  return (
    <div className="mt-4 space-y-4">
      <Card>
        <CardContent className="grid gap-2 pt-4 md:grid-cols-3">
          <div>
            <Label>Filter terapi</Label>
            <Select value={scheduleTherapy || "__all"} onValueChange={(v) => onScheduleTherapyChange(v === "__all" ? "" : v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">Semua</SelectItem>
                {therapies.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.therapyName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tanggal</Label>
            <DatePicker value={scheduleDate} onChange={onScheduleDateChange} />
          </div>
        </CardContent>
      </Card>

      {canEdit ? (
        <div className="flex flex-wrap gap-2">
          {therapies.map((t) => (
            <Button
              key={t.id}
              size="sm"
              variant="outline"
              disabled={genSlotsPending}
              onClick={() => onGenerateSlots(t.id)}
            >
              Generate slot: {t.therapyName}
            </Button>
          ))}
          <Button
            size="sm"
            variant="destructive"
            disabled={deleteBulkPending || selectedSlotIds.length === 0}
            onClick={() => onDeleteSlotsBulk(selectedSlotIds)}
          >
            Hapus terpilih ({selectedSlotIds.length})
          </Button>
        </div>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base">Slot waktu</CardTitle>
          {slots.length > 0 ? (
            <ListSortControl options={SCHEDULE_SLOT_SORT_OPTIONS} sortBy={slotSort.sortBy} sortDir={slotSort.sortDir} onChange={setSlotSort} />
          ) : null}
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {canEdit && sortedSlots.length > 0 ? (
            <label className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={allSlotsSelected}
                onChange={(e) => onSelectedSlotIdsChange(e.target.checked ? sortedSlots.map((s) => s.id) : [])}
              />
              Pilih semua slot
            </label>
          ) : null}
          {sortedSlots.length === 0 ? (
            <p className="text-muted-foreground">Belum ada slot. Generate dari tab ini atau simpan pengaturan terapi dulu.</p>
          ) : (
            sortedSlots.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {canEdit ? (
                    <input
                      type="checkbox"
                      checked={selectedSlotIds.includes(s.id)}
                      onChange={(e) =>
                        onSelectedSlotIdsChange(
                          e.target.checked
                            ? [...new Set([...selectedSlotIds, s.id])]
                            : selectedSlotIds.filter((id) => id !== s.id),
                        )
                      }
                    />
                  ) : null}
                  <span>
                    {formatTimeSlotLine(s.slotDate, s.startTime, s.endTime, s.therapyName, s.bookedCount, s.capacity)}
                  </span>
                </div>
                {canEdit ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    disabled={deleteSlotPending || deleteBulkPending}
                    onClick={() => onDeleteSlot(s.id)}
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    Hapus
                  </Button>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base">Pasien terjadwal</CardTitle>
          <div className="flex flex-wrap items-end gap-3">
            {patients.length > 0 ? (
              <ListSortControl
                options={SCHEDULE_PATIENT_SORT_OPTIONS}
                sortBy={patientSort.sortBy}
                sortDir={patientSort.sortDir}
                onChange={setPatientSort}
              />
            ) : null}
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {(Object.keys(COLUMN_LABELS) as ScheduleColumn[]).map((col) => (
              <label key={col} className="flex items-center gap-1">
                <input type="checkbox" checked={!hiddenCols.has(col)} onChange={() => toggleCol(col)} />
                {COLUMN_LABELS[col]}
              </label>
            ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {sortedPatients.length === 0 ? (
            <p className="text-sm text-muted-foreground">Tidak ada pasien untuk filter ini.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pasien</TableHead>
                  <TableHead>Terapi</TableHead>
                  <TableHead>Jadwal</TableHead>
                  {visibleCols.includes("birthDate") ? <TableHead>Tgl lahir</TableHead> : null}
                  {visibleCols.includes("complaint") ? <TableHead>Keluhan</TableHead> : null}
                  {visibleCols.includes("preferredTime") ? <TableHead>Jam preferensi</TableHead> : null}
                  {visibleCols.includes("status") ? <TableHead>Status</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedPatients.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.fullName}</TableCell>
                    <TableCell>{p.therapyName ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatPatientSlotLabel(p.slotLabel) || "—"}
                    </TableCell>
                    {visibleCols.includes("birthDate") ? (
                      <TableCell>{formatEventDateId(p.birthDate)}</TableCell>
                    ) : null}
                    {visibleCols.includes("complaint") ? (
                      <TableCell className="max-w-[200px] truncate">{p.complaint || "—"}</TableCell>
                    ) : null}
                    {visibleCols.includes("preferredTime") ? (
                      <TableCell>{p.preferredTime?.slice(0, 5) || "—"}</TableCell>
                    ) : null}
                    {visibleCols.includes("status") ? <TableCell>{p.reservationStatus}</TableCell> : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
