"use client";

import { use, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, RefreshCw, X } from "lucide-react";
import { SortableTableHead } from "@/components/events/sortable-table-head";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { eventsApi, type PublicStaffMonitorPerson } from "@/lib/api/events";
import { toApiError } from "@/lib/api/client";
import type { ListSortState } from "@/lib/events-sort";

const MONITOR_SORT_DEFAULT: ListSortState = { sortBy: "fullName", sortDir: "asc" };

function therapyLabel(names: string[] | null | undefined, isPencatat: boolean) {
  const list = names ?? [];
  const base = list.length > 0 ? list.join(", ") : "—";
  return isPencatat ? `${base} · Pencatat` : base;
}

function monitorRoleLabel(person: PublicStaffMonitorPerson) {
  const roleName = person.volunteerRoleName?.trim();
  if (!roleName) {
    return person.roleLabel;
  }
  const base = person.roleLabel.trim() || "Relawan";
  return `${base} · ${roleName}`;
}

function sortMonitorStaff(staff: PublicStaffMonitorPerson[], sort: ListSortState) {
  const dir = sort.sortDir === "asc" ? 1 : -1;
  return [...staff].sort((a, b) => {
    let cmp = 0;
    switch (sort.sortBy) {
      case "roleLabel":
        cmp = monitorRoleLabel(a).localeCompare(monitorRoleLabel(b), "id");
        break;
      case "therapy":
        cmp = therapyLabel(a.therapyNames, a.isPencatat).localeCompare(
          therapyLabel(b.therapyNames, b.isPencatat),
          "id",
        );
        break;
      default:
        cmp = a.fullName.localeCompare(b.fullName, "id");
    }
    return cmp * dir;
  });
}

export default function PublicStaffMonitorPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; eventSlug: string }>;
}) {
  const { tenantSlug, eventSlug } = use(params);
  const [tableSort, setTableSort] = useState(MONITOR_SORT_DEFAULT);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["public-staff-monitor", tenantSlug, eventSlug],
    queryFn: () => eventsApi.getPublicStaffMonitor(tenantSlug, eventSlug),
    staleTime: Infinity,
    retry: false,
  });

  const sortedStaff = useMemo(
    () => (data ? sortMonitorStaff(data.staff, tableSort) : []),
    [data, tableSort],
  );

  if (isLoading) {
    return (
      <main className="mx-auto max-w-5xl p-6">
        <p className="text-muted-foreground">Memuat...</p>
      </main>
    );
  }

  if (error || !data) {
    const message = error ? toApiError(error).message : "Acara tidak tersedia";
    return (
      <main className="mx-auto max-w-5xl p-6">
        <Card>
          <CardHeader>
            <CardTitle>Tidak tersedia</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{message}</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl space-y-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{data.eventName}</h1>
          <p className="text-sm text-muted-foreground">
            Pantau daftar staf · {data.startDate} — {data.endDate}
            {data.location ? ` · ${data.location}` : ""}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isFetching}
          onClick={() => void refetch()}
        >
          <RefreshCw className={`mr-2 size-4 ${isFetching ? "animate-spin" : ""}`} />
          Muat ulang
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Unik (konsumsi)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{data.mealConsumptionCount}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Kapasitas terapi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {data.therapyCapacity.length === 0 ? (
              <p className="text-muted-foreground">Belum ada terapi.</p>
            ) : (
              data.therapyCapacity.map((row) => (
                <div key={row.therapyId} className="flex justify-between gap-2">
                  <span>{row.therapyName}</span>
                  <span className="font-medium tabular-nums">
                    {row.current} / {row.max}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Daftar staf ({data.staff.length})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0 sm:p-6 sm:pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead
                  label="Nama"
                  sortKey="fullName"
                  sort={tableSort}
                  onSortChange={setTableSort}
                />
                <SortableTableHead
                  label="Peran"
                  sortKey="roleLabel"
                  sort={tableSort}
                  onSortChange={setTableSort}
                />
                <SortableTableHead
                  label="Terapi"
                  sortKey="therapy"
                  sort={tableSort}
                  onSortChange={setTableSort}
                />
                <TableHead className="w-20 text-center">Makan</TableHead>
                <TableHead>Catatan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedStaff.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    Belum ada staf terdaftar.
                  </TableCell>
                </TableRow>
              ) : (
                sortedStaff.map((person, index) => (
                  <TableRow key={`${person.fullName}-${person.roleLabel}-${index}`}>
                    <TableCell className="font-medium">{person.fullName}</TableCell>
                    <TableCell>{monitorRoleLabel(person)}</TableCell>
                    <TableCell>{therapyLabel(person.therapyNames, person.isPencatat)}</TableCell>
                    <TableCell className="text-center">
                      {person.countsTowardMeals ? (
                        <Check className="mx-auto size-4 text-green-600" aria-label="Dihitung makan" />
                      ) : (
                        <X className="mx-auto size-4 text-red-600" aria-label="Tidak dihitung makan" />
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs whitespace-pre-wrap text-muted-foreground">
                      {person.notes?.trim() || "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
