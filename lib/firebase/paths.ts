/**
 * Path Firestore (read-only dari client).
 *
 * TODO(BE): path belum final — docs/API_AI_CONFIG.md (be/h1-llm-master @ab3e858) belum
 * mendefinisikan dokumen Firestore maupun field-nya. Semua path dikumpulkan di sini supaya
 * cukup diubah satu tempat saat kontrak backend terbit. tenantId hanya dipakai untuk
 * menyusun path baca (aturan keamanan Firestore yang menegakkan akses), tidak dikirim ke API.
 */
export const firestorePaths = {
  /** Pesan sesi simulator, diurutkan berdasarkan field createdAt. */
  simulatorMessages: (tenantId: string, sessionId: string) =>
    `tenants/${tenantId}/simulatorSessions/${sessionId}/messages`,
} as const;

/** TODO(BE): nama field urutan pada dokumen pesan. */
export const FIRESTORE_ORDER_FIELD = "createdAt";
