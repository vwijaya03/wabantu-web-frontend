/** Tenant-scoped React Query keys for events module (mirrors inbox pattern). */

export function eventsListKey(
  tenantKey: string,
  search: string,
  statusFilter: string,
  sortKey: string,
  page: number,
) {
  return ["events", tenantKey, search, statusFilter, sortKey, page] as const;
}

export function eventDetailKey(tenantKey: string, eventId: string) {
  return ["event", tenantKey, eventId] as const;
}

export function eventDashboardKey(tenantKey: string, eventId: string) {
  return ["event-dashboard", tenantKey, eventId] as const;
}

export function eventScheduleKey(
  tenantKey: string,
  eventId: string,
  therapyId: string,
  date: string,
) {
  return ["event-schedule", tenantKey, eventId, therapyId, date] as const;
}

export function eventSchedulePrefix(tenantKey: string, eventId: string) {
  return ["event-schedule", tenantKey, eventId] as const;
}

export function eventTherapySettingsKey(tenantKey: string, eventId: string) {
  return ["event-therapy-settings", tenantKey, eventId] as const;
}

export function eventTherapiesMasterKey(tenantKey: string) {
  return ["event-therapies-master", tenantKey] as const;
}

export function eventRolesMasterKey(tenantKey: string) {
  return ["event-roles-master", tenantKey] as const;
}

export function eventPatientsKey(tenantKey: string, eventId: string, ...rest: unknown[]) {
  return ["event-patients", tenantKey, eventId, ...rest] as const;
}

export function eventPeopleKey(tenantKey: string, eventId: string, ...rest: unknown[]) {
  return ["event-people", tenantKey, eventId, ...rest] as const;
}

export function eventAssignmentsKey(tenantKey: string, eventId: string, ...rest: unknown[]) {
  return ["event-assignments", tenantKey, eventId, ...rest] as const;
}

export function eventTasksMasterKey(tenantKey: string) {
  return ["event-tasks-master", tenantKey] as const;
}

export function eventStaffRosterKey(tenantKey: string) {
  return ["event-staff-roster", tenantKey] as const;
}

export function eventExportJobsKey(tenantKey: string, eventId: string) {
  return ["event-export-jobs", tenantKey, eventId] as const;
}
