import { api } from "./client";

export type EventStatus = "DRAFT" | "PUBLISHED" | "CLOSED" | "CANCELLED" | "ARCHIVED";

export interface EventRow {
  id: string;
  eventName: string;
  eventSlug: string;
  eventDescription?: string;
  location?: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  registrationOpenAt?: string;
  registrationCloseAt?: string;
  status: EventStatus;
  breakStartTime?: string;
  breakEndTime?: string;
}

export interface Therapy {
  id: string;
  therapyName: string;
  description?: string;
  active: boolean;
  displayOrder: number;
}

export interface VolunteerRole {
  id: string;
  roleName: string;
  active: boolean;
  displayOrder: number;
}

export interface Task {
  id: string;
  taskName: string;
  assignmentType: "PER_HOUR" | "PER_SESSION" | "FIXED";
  active: boolean;
  displayOrder: number;
}

export interface EventPerson {
  id: string;
  eventId: string;
  fullName: string;
  personType: string;
  role?: string;
  attendanceStatus: string;
  arrivalTime?: string;
  departureTime?: string;
  notes?: string;
  therapyId?: string;
  therapyIds?: string[];
  therapyNames?: string[];
  volunteerRoleId?: string;
  isPencatat?: boolean;
  availableFrom?: string;
  availableUntil?: string;
  createdAt?: string;
}

export type UpsertEventPersonBody = {
  fullName?: string;
  role?: string;
  personType?: string;
  rosterId?: string;
  saveToRoster?: boolean;
  attendanceStatus?: string;
  arrivalTime?: string;
  departureTime?: string;
  notes?: string;
  therapyId?: string;
  therapyIds?: string[];
  volunteerRoleId?: string;
  isPencatat?: boolean;
  availableFrom?: string;
  availableUntil?: string;
};

export interface StaffRosterEntry {
  id: string;
  fullName: string;
  personType: string;
  role?: string;
  therapyIds?: string[];
  therapyNames?: string[];
  volunteerRoleId?: string;
  isPencatat?: boolean;
  notes?: string;
}

export interface Assignment {
  id: string;
  eventId: string;
  taskId: string;
  taskName?: string;
  personId: string;
  personName?: string;
  startTime?: string;
  endTime?: string;
  sessionName?: string;
}

export interface Patient {
  id: string;
  eventId: string;
  therapyId: string;
  therapyName?: string;
  fullName: string;
  birthDate: string;
  complaint?: string;
  preferredTime?: string;
  reservationStatus: string;
  slotId?: string;
  slotLabel?: string;
}

export interface TimeSlot {
  id: string;
  eventId: string;
  therapyId: string;
  therapyName?: string;
  slotDate: string;
  startTime: string;
  endTime: string;
  capacity: number;
  bookedCount: number;
  available: number;
}

export interface DeleteSlotsResult {
  deleted: number;
  blocked: number;
  errors?: string[];
}

export interface DeletePatientsResult {
  deleted: number;
  failed: number;
  errors?: string[];
}

export interface DeletePeopleResult {
  deleted: number;
  failed: number;
  errors?: string[];
}

export interface TherapySlotTemplate {
  id?: string;
  startTime: string;
  endTime: string;
  capacity?: number;
  sortOrder: number;
}

export interface EventTherapySetting {
  id: string;
  eventId: string;
  therapyId: string;
  therapyName?: string;
  slotDurationMinutes: number;
  maxCapacity?: number;
  capacityMode: string;
  scheduleMode: string;
  scheduleStartTime?: string;
  scheduleEndTime?: string;
  slotTemplates?: TherapySlotTemplate[];
}

export type EventExportKind = "patients_pdf" | "patients_xlsx" | "staff_sheet" | "staff_list";

export interface EventExportJob {
  id: string;
  eventId: string;
  kind: EventExportKind;
  format?: string;
  status: "queued" | "processing" | "done" | "failed";
  downloadUrl?: string;
  fileName?: string;
  rowCount?: number;
  errorMsg?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventDashboard {
  eventId: string;
  patientsRegistered: number;
  patientsCompleted: number;
  patientsCancelled: number;
  therapyCapacity: { therapyId: string; therapyName: string; current: number; max: number }[];
  peopleByType: Record<string, number>;
  uniquePeopleCount: number;
  mealConsumptionCount: number;
}

export interface PublicEventInfo {
  eventName: string;
  eventDescription?: string;
  location?: string;
  startDate: string;
  endDate: string;
  status: string;
  registrationOpen: boolean;
  message?: string;
  therapies: Therapy[];
  closed: boolean;
  cancelled: boolean;
}

export interface PublicStaffEventInfo {
  eventName: string;
  eventDescription?: string;
  location?: string;
  startDate: string;
  endDate: string;
  status: string;
  registrationOpen: boolean;
  message?: string;
  therapies: Therapy[];
  volunteerRoles: VolunteerRole[];
  closed: boolean;
  cancelled: boolean;
}

export interface PublicSlotOption {
  slotId: string;
  slotDate: string;
  startTime: string;
  endTime: string;
  label: string;
  available: number;
}

/** Maksimum baris per export PDF (harus selaras dengan api-go/events). */
export const EVENTS_MAX_PATIENT_EXPORT_ROWS = 2500;

export const eventsApi = {
  listEvents: (
    params?: {
      q?: string;
      status?: string;
      sortBy?: string;
      sortDir?: string;
      page?: number;
      pageSize?: number;
    },
    signal?: AbortSignal,
  ) =>
    api.get<{ items: EventRow[]; total: number }>("/events", { params, signal }).then((r) => r.data),

  getEvent: (id: string, signal?: AbortSignal) =>
    api.get<EventRow>(`/events/detail/${id}`, { signal }).then((r) => r.data),

  createEvent: (body: Partial<EventRow>) => api.post<EventRow>("/events", body).then((r) => r.data),

  updateEvent: (id: string, body: Partial<EventRow>) =>
    api.put<EventRow>(`/events/detail/${id}`, body).then((r) => r.data),

  deleteEvent: (id: string) => api.delete(`/events/detail/${id}`),

  duplicateEvent: (
    eventId: string,
    body?: { eventName?: string; startDate?: string; endDate?: string },
  ) =>
    api
      .post<{
        event: EventRow;
        peopleCopied: number;
        patientsCopied: number;
        therapySettingsCopied: number;
      }>(`/events/detail/${eventId}/duplicate`, body ?? {})
      .then((r) => r.data),

  getDashboard: (eventId: string, signal?: AbortSignal) =>
    api
      .get<EventDashboard>(`/events/detail/${eventId}/dashboard`, { signal })
      .then((r) => r.data),

  listTherapies: (params?: { q?: string; page?: number; pageSize?: number; activeOnly?: boolean }) =>
    api.get<{ items: Therapy[]; total: number }>("/events/masters/therapies", { params }).then((r) => r.data),

  createTherapy: (body: Partial<Therapy>) =>
    api.post<Therapy>("/events/masters/therapies", body).then((r) => r.data),

  updateTherapy: (id: string, body: Partial<Therapy>) =>
    api.put<Therapy>(`/events/masters/therapies/${id}`, body).then((r) => r.data),

  deleteTherapy: (id: string) => api.delete(`/events/masters/therapies/${id}`),

  listVolunteerRoles: (params?: { q?: string; page?: number; pageSize?: number }) =>
    api.get<{ items: VolunteerRole[]; total: number }>("/events/masters/volunteer-roles", { params }).then((r) => r.data),

  createVolunteerRole: (body: Partial<VolunteerRole>) =>
    api.post<VolunteerRole>("/events/masters/volunteer-roles", body).then((r) => r.data),

  updateVolunteerRole: (id: string, body: Partial<VolunteerRole>) =>
    api.put<VolunteerRole>(`/events/masters/volunteer-roles/${id}`, body).then((r) => r.data),

  deleteVolunteerRole: (id: string) => api.delete(`/events/masters/volunteer-roles/${id}`),

  listTasks: (params?: { q?: string; page?: number; pageSize?: number }) =>
    api.get<{ items: Task[]; total: number }>("/events/masters/tasks", { params }).then((r) => r.data),

  createTask: (body: Partial<Task>) => api.post<Task>("/events/masters/tasks", body).then((r) => r.data),

  updateTask: (id: string, body: Partial<Task>) =>
    api.put<Task>(`/events/masters/tasks/${id}`, body).then((r) => r.data),

  deleteTask: (id: string) => api.delete(`/events/masters/tasks/${id}`),

  listPeople: (
    eventId: string,
    params?: {
      q?: string;
      personType?: string;
      sortBy?: string;
      sortDir?: string;
      page?: number;
      pageSize?: number;
    },
  ) =>
    api
      .get<{ items: EventPerson[]; total: number }>(`/events/detail/${eventId}/people`, { params })
      .then((r) => r.data),

  createPerson: (eventId: string, body: UpsertEventPersonBody) =>
    api.post<EventPerson>(`/events/detail/${eventId}/people`, body).then((r) => r.data),

  updatePerson: (eventId: string, personId: string, body: UpsertEventPersonBody) =>
    api.put<EventPerson>(`/events/detail/${eventId}/people/${personId}`, body).then((r) => r.data),

  deletePerson: (eventId: string, personId: string) =>
    api.delete(`/events/detail/${eventId}/people/${personId}`),

  deletePeopleBulk: (eventId: string, personIds: string[]) =>
    api
      .post<DeletePeopleResult>(`/events/detail/${eventId}/people/delete-bulk`, { personIds })
      .then((r) => r.data),

  listAssignments: (
    eventId: string,
    params?: { q?: string; sortBy?: string; sortDir?: string; page?: number; pageSize?: number },
  ) =>
    api
      .get<{ items: Assignment[]; total: number }>(`/events/detail/${eventId}/assignments`, { params })
      .then((r) => r.data),

  createAssignment: (eventId: string, body: Partial<Assignment>) =>
    api.post<Assignment>(`/events/detail/${eventId}/assignments`, body).then((r) => r.data),

  updateAssignment: (eventId: string, assignmentId: string, body: Partial<Assignment>) =>
    api
      .put<Assignment>(`/events/detail/${eventId}/assignments/${assignmentId}`, body)
      .then((r) => r.data),

  deleteAssignment: (eventId: string, assignmentId: string) =>
    api.delete(`/events/detail/${eventId}/assignments/${assignmentId}`),

  listPatients: (
    eventId: string,
    params?: {
      q?: string;
      therapyId?: string;
      status?: string;
      slotDate?: string;
      hasSlot?: string;
      sortBy?: string;
      sortDir?: string;
      page?: number;
      pageSize?: number;
    },
  ) =>
    api
      .get<{ items: Patient[]; total: number }>(`/events/detail/${eventId}/patients`, { params })
      .then((r) => r.data),

  createExportJob: (
    eventId: string,
    body: {
      kind: EventExportKind;
      format?: "pdf" | "xlsx";
      filters?: {
        q?: string;
        therapyId?: string;
        status?: string;
        slotDate?: string;
        hasSlot?: string;
        sortBy?: string;
        sortDir?: string;
        /** Kolom yang disembunyikan (No & Nama selalu ikut). */
        hiddenColumns?: string[];
      };
      staffFilters?: {
        sortBy?: string;
        sortDir?: string;
      };
    },
  ) => api.post<EventExportJob>(`/events/detail/${eventId}/export-jobs`, body).then((r) => r.data),

  getExportJob: (eventId: string, jobId: string) =>
    api.get<EventExportJob>(`/events/detail/${eventId}/export-jobs/${jobId}`).then((r) => r.data),

  listExportJobs: (eventId: string) =>
    api.get<{ items: EventExportJob[] }>(`/events/detail/${eventId}/export-jobs`).then((r) => r.data),

  createPatient: (
    eventId: string,
    body: {
      contactId?: string;
      fullName: string;
      birthDate: string;
      therapyId: string;
      complaint?: string;
      preferredTime?: string;
    },
  ) => api.post<Patient>(`/events/detail/${eventId}/patients`, body).then((r) => r.data),

  listStaffRoster: () =>
    api.get<{ items: StaffRosterEntry[]; total: number }>("/events/staff-roster").then((r) => r.data),

  importStaffRoster: (eventId: string) =>
    api
      .post<{ added: number; skipped: number }>(
        `/events/detail/${eventId}/people/import-roster`,
        undefined,
        { timeout: 120_000 },
      )
      .then((r) => r.data),

  syncStaffRosterFromEvent: (eventId: string) =>
    api
      .post<{ upserted: number }>(`/events/staff-roster/sync-from-event/${eventId}`, undefined, {
        timeout: 120_000,
      })
      .then((r) => r.data),

  updatePatient: (
    eventId: string,
    patientId: string,
    body: {
      fullName: string;
      birthDate: string;
      therapyId: string;
      complaint?: string;
      preferredTime?: string;
      reservationStatus?: string;
    },
  ) => api.put<Patient>(`/events/detail/${eventId}/patients/${patientId}`, body).then((r) => r.data),

  deletePatient: (eventId: string, patientId: string) =>
    api.delete(`/events/detail/${eventId}/patients/${patientId}`),

  deletePatientsBulk: (eventId: string, patientIds: string[]) =>
    api
      .post<DeletePatientsResult>(`/events/detail/${eventId}/patients/delete-bulk`, { patientIds })
      .then((r) => r.data),

  updatePatientStatus: (eventId: string, patientId: string, reservationStatus: string) =>
    api.patch(`/events/detail/${eventId}/patients/${patientId}`, { reservationStatus }),

  listSlots: (eventId: string, params?: { therapyId?: string; date?: string }) =>
    api.get<{ items: TimeSlot[] }>(`/events/detail/${eventId}/slots`, { params }).then((r) => r.data),

  generateSlots: (eventId: string, therapyId: string) =>
    api
      .post<{ created: number; warnings?: string[] }>(
        `/events/detail/${eventId}/therapies/${therapyId}/generate-slots`,
      )
      .then((r) => r.data),

  deleteSlot: (eventId: string, slotId: string) =>
    api.delete(`/events/detail/${eventId}/slots/${slotId}`),

  deleteSlotsBulk: (eventId: string, slotIds: string[]) =>
    api.post<DeleteSlotsResult>(`/events/detail/${eventId}/slots/delete-bulk`, { slotIds }).then((r) => r.data),

  upsertEventTherapy: (
    eventId: string,
    body: {
      therapyId: string;
      slotDurationMinutes: number;
      maxCapacity?: number;
      capacityMode: string;
      scheduleMode?: string;
      scheduleStartTime?: string;
      scheduleEndTime?: string;
      slotTemplates?: TherapySlotTemplate[];
    },
  ) => api.put(`/events/detail/${eventId}/therapy-settings`, body).then((r) => r.data),

  listEventTherapySettings: (eventId: string) =>
    api.get<{ items: EventTherapySetting[] }>(`/events/detail/${eventId}/therapy-settings`).then((r) => r.data),

  getSchedule: (
    eventId: string,
    params?: { therapyId?: string; date?: string },
    signal?: AbortSignal,
  ) =>
    api
      .get<{ slots: TimeSlot[]; patients: Patient[] }>(`/events/detail/${eventId}/schedule`, {
        params,
        signal,
      })
      .then((r) => r.data),

  getPublicRegistration: (tenantSlug: string, eventSlug: string) =>
    api
      .get<PublicEventInfo>(`/public/events/${tenantSlug}/register/${eventSlug}`)
      .then((r) => r.data),

  getPublicStaffRegistration: (tenantSlug: string, eventSlug: string) =>
    api
      .get<PublicStaffEventInfo>(`/public/events/${tenantSlug}/register/${eventSlug}/staff`)
      .then((r) => r.data),

  postPublicStaffRegistration: (
    tenantSlug: string,
    eventSlug: string,
    body: {
      fullName: string;
      role: string;
      therapyIds?: string[];
      volunteerRoleId?: string;
      phone?: string;
      notes?: string;
    },
  ) =>
    api
      .post<{ success: boolean; message: string }>(
        `/public/events/${tenantSlug}/register/${eventSlug}/staff`,
        body,
      )
      .then((r) => r.data),

  getPublicRegistrationSlots: (tenantSlug: string, eventSlug: string, therapyId: string) =>
    api
      .get<{ items: PublicSlotOption[] }>(`/public/events/${tenantSlug}/register/${eventSlug}/slots`, {
        params: { therapyId },
      })
      .then((r) => r.data),

  postPublicRegistration: (
    tenantSlug: string,
    eventSlug: string,
    body: {
      fullName: string;
      birthDate: string;
      therapyId: string;
      complaint?: string;
      preferredTime?: string;
    },
  ) =>
    api
      .post<{ success: boolean; message: string }>(`/public/events/${tenantSlug}/register/${eventSlug}`, body)
      .then((r) => r.data),
};
