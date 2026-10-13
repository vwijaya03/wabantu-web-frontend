import { api } from "./client";

/**
 * Simulator chat web (golden flow demo).
 *
 * TODO(BE): kontrak resmi akan ditulis di wabantu-api-go docs/API_AI_CONFIG.md (branch be/h1-llm-master).
 * Sampai dokumen itu ada, path & tipe di bawah adalah USULAN dan backend akan 404.
 * Jangan menampilkan data palsu: UI wajib menampilkan status "Endpoint belum tersedia".
 */
export const SIMULATOR_BASE_PROPOSED = "/admin/simulator";

export interface SimulatorTenant {
  id: string;
  name: string;
}

export interface SimulatorReseller {
  id: string;
  name: string;
  /** nama tingkat harga, mis. "Agen", "Reseller", "Distributor" */
  tier: string;
}

export interface SimulatorQuoteLine {
  productName: string;
  qty: number;
  unitPrice: number;
  tier: string;
}

export interface SimulatorMessage {
  id: string;
  direction: "in" | "out";
  author: "contact" | "ai" | "system";
  type: "text" | "image";
  body: string | null;
  createdAt: string;
  quote?: SimulatorQuoteLine[] | null;
  orderId?: string | null;
  orderStatus?: string | null;
}

export interface SimulatorSession {
  sessionId: string;
  messages: SimulatorMessage[];
}

export const simulatorApi = {
  /** USULAN */
  async listTenants(): Promise<{ tenants: SimulatorTenant[] }> {
    return (await api.get(`${SIMULATOR_BASE_PROPOSED}/tenants`)).data;
  },
  /** USULAN */
  async listResellers(tenantId: string): Promise<{ resellers: SimulatorReseller[] }> {
    return (await api.get(`${SIMULATOR_BASE_PROPOSED}/tenants/${tenantId}/resellers`)).data;
  },
  /** USULAN — buat sesi baru (percakapan bersih) untuk reseller tsb. */
  async startSession(tenantId: string, resellerId: string): Promise<SimulatorSession> {
    return (await api.post(`${SIMULATOR_BASE_PROPOSED}/sessions`, { tenantId, resellerId })).data;
  },
  /** USULAN — kirim teks; respons berisi pesan baru (pesan user + balasan bot). */
  async sendMessage(sessionId: string, text: string): Promise<{ messages: SimulatorMessage[] }> {
    return (await api.post(`${SIMULATOR_BASE_PROPOSED}/sessions/${sessionId}/messages`, { text })).data;
  },
  /** USULAN — upload bukti transfer (multipart, field "file"). */
  async uploadProof(sessionId: string, file: File): Promise<{ messages: SimulatorMessage[] }> {
    const form = new FormData();
    form.append("file", file);
    return (await api.post(`${SIMULATOR_BASE_PROPOSED}/sessions/${sessionId}/payment-proof`, form)).data;
  },
};
