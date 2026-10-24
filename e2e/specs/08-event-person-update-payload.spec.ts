import { test, expect } from "@playwright/test";
import type { EventPerson } from "../../lib/api/events";
import { buildUpdatePersonPayload, personToStaffForm } from "../../lib/events-person-form";

/**
 * Tanpa backend/browser. PUT /events/detail/:eventId/people/:personId di api-go = FULL REPLACE
 * semua field, jadi edit yang hanya mengubah nama harus mengirim ulang semua nilai asal.
 */
function editOnlyName(p: EventPerson, newName: string) {
  const form = personToStaffForm(p);
  return buildUpdatePersonPayload({ ...form, fullName: newName });
}

test.describe("payload edit person (full replace)", () => {
  test("(a) non-relawan dengan catatan + jam datang/pulang", () => {
    const body = editOnlyName(
      {
        id: "p1", eventId: "E1", fullName: "Shijie Lama", personType: "SHIJIE", attendanceStatus: "PARTIAL",
        arrivalTime: "08:15:00", departureTime: "12:30:00", notes: "Bawa alat sendiri",
        countsTowardMeals: true, mealNotes: "tanpa nasi", isPencatat: false,
      },
      "Shijie Baru",
    );
    expect(body).toMatchObject({
      fullName: "Shijie Baru", role: "shijie", personType: "SHIJIE", attendanceStatus: "PARTIAL",
      arrivalTime: "08:15", departureTime: "12:30", notes: "Bawa alat sendiri",
      countsTowardMeals: true, mealNotes: "tanpa nasi", therapyIds: [],
      availableFrom: null, availableUntil: null, volunteerRoleId: null, isPencatat: false,
    });
  });

  test("(b) terapis dengan terapi + ketersediaan", () => {
    const body = editOnlyName(
      {
        id: "p2", eventId: "E1", fullName: "Terapis Lama", personType: "THERAPIST", attendanceStatus: "PRESENT",
        therapyIds: ["t1", "t2"], therapyNames: ["Akupunktur", "Pijat"], availableFrom: "09:00:00", availableUntil: "14:00:00",
        countsTowardMeals: false, isPencatat: false,
      },
      "Terapis Baru",
    );
    expect(body).toMatchObject({
      fullName: "Terapis Baru", role: "terapis", personType: "THERAPIST", attendanceStatus: "PRESENT",
      therapyIds: ["t1", "t2"], availableFrom: "09:00", availableUntil: "14:00",
      arrivalTime: null, departureTime: null, notes: "", countsTowardMeals: false, mealNotes: "",
      volunteerRoleId: null, isPencatat: false,
    });
  });

  test("(c) relawan dengan peran + pencatat", () => {
    const body = editOnlyName(
      {
        id: "p3", eventId: "E1", fullName: "Relawan Lama", personType: "VOLUNTEER", attendanceStatus: "ABSENT",
        volunteerRoleId: "r1", volunteerRoleName: "Konsumsi", isPencatat: true, notes: "Shift pagi",
        arrivalTime: "07:00:00", countsTowardMeals: true, mealNotes: "nasi setengah",
      },
      "Relawan Baru",
    );
    expect(body).toMatchObject({
      fullName: "Relawan Baru", role: "relawan", personType: "VOLUNTEER", attendanceStatus: "ABSENT",
      volunteerRoleId: "r1", isPencatat: true, notes: "Shift pagi", arrivalTime: "07:00", departureTime: null,
      countsTowardMeals: true, mealNotes: "nasi setengah", therapyIds: [], availableFrom: null, availableUntil: null,
    });
  });
});
