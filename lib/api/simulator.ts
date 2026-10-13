import { api } from "./client";

/**
 * Simulator chat web (golden flow demo).
 * Kontrak resmi: wabantu-api-go docs/API_AI_CONFIG.md §2 (branch be/h1-llm-master).
 * Status backend: FINAL & implemented (`webhook/simulator.go`, be/h1-llm-master 493cec2).
 * Tenant = tenant sesi (owner/staff, atau super_admin saat impersonate). Pembeli hanya bisa kirim teks/gambar.
 */

export const SIM_SESSION_ID_RE = /^[A-Za-z0-9_-]{6,64}$/;
export const SIM_MAX_TEXT = 1000;
export const SIM_MAX_BUYER_NAME = 60;
export const SIM_MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const SIM_IMAGE_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
export type SimImageMime = (typeof SIM_IMAGE_MIME)[number];

export interface SimSendRequest {
  sessionId: string;
  buyerName?: string;
  text?: string;
  image?: { base64: string; mimeType: SimImageMime };
}

export interface SimSendResponse {
  conversationId: string;
  messageId: string;
  status: "queued";
}

export interface SimMessage {
  id: string;
  direction: "inbound" | "outbound";
  author: string;
  type: "text" | "image";
  text: string;
  createdAt: string;
  status: string;
  /** Untuk pesan gambar: URL media terautentikasi (/api/v1/inbox/messages/:id/media). */
  imageUrl?: string | null;
}

/** Tingkat harga yang dikutip AI untuk pembeli ini (kode price type, mis. umum/reseller/agen). */
export interface SimPricing {
  tier: string;
  tierLabel: string;
}

export interface SimOrderItem {
  name: string;
  qty: number;
  unitPrice: number;
  unit?: string;
}

export type SimProofCheck = "" | "cocok" | "perlu_dicek";

/** Order terbaru percakapan simulator (read-only untuk pembeli). */
export interface SimOrder {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: number;
  proofCheck?: SimProofCheck;
  proofCheckReasons?: string[];
  items: SimOrderItem[];
  updatedAt: string;
}

/**
 * pricing/order/imageUrl: dari kode backend @013e622 (webhook/simulator.go, internal/simulator/view.go);
 * docs/API_AI_CONFIG.md §2 belum diperbarui untuk field ini.
 */
export interface SimMessagesResponse {
  conversationId: string | null;
  messages: SimMessage[];
  /** null sebelum pesan pertama */
  pricing: SimPricing | null;
  /** null bila belum ada order */
  order: SimOrder | null;
}

export function newSimSessionId(): string {
  return `sim-${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

export const simulatorApi = {
  async send(req: SimSendRequest): Promise<SimSendResponse> {
    return (await api.post<SimSendResponse>("/simulator/messages", req)).data;
  },
  async list(sessionId: string, after?: string): Promise<SimMessagesResponse> {
    const res = await api.get<SimMessagesResponse>("/simulator/messages", {
      params: { sessionId, after: after || undefined },
    });
    return res.data;
  },
};
