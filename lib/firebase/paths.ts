/**
 * Path Firestore (read-only dari client) — sesuai docs/API_AI_CONFIG.md §5 (be/h1-llm-master @c8f4eda).
 * Aturan: baca hanya bila token.tenantId == tenantId (owner/staff/super_admin); client tidak pernah menulis.
 * tenantId diambil dari respons POST /auth/firebase-token (klaim server), bukan dari input client.
 */
export const firestorePaths = {
  simConversation: (tenantId: string, conversationId: string) =>
    `tenants/${tenantId}/simConversations/${conversationId}`,
  /** Pesan simulator; urutkan berdasarkan createdAt (timestamp). */
  simMessages: (tenantId: string, conversationId: string) =>
    `tenants/${tenantId}/simConversations/${conversationId}/messages`,
  /** Mirror order (saat ini hanya order percakapan simulator); field updatedAt. */
  orders: (tenantId: string) => `tenants/${tenantId}/orders`,
} as const;

export const FIRESTORE_MESSAGES_ORDER_FIELD = "createdAt";
export const FIRESTORE_ORDERS_ORDER_FIELD = "updatedAt";
