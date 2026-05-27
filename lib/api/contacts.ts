import { api } from "./client";

export interface Contact {
  id: string;
  phoneNumber: string;
  displayName?: string | null;
  notes?: string | null;
  status: "active" | "inactive" | string;
  priceTypeId?: string | null;
  tags: string[];
}

export interface ListContactsParams {
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface ListContactsResponse {
  items: Contact[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ContactInput {
  phoneNumber: string;
  displayName?: string;
  notes?: string;
  status?: string;
  priceTypeId?: string;
  tags?: string[];
}

export type ContactUpdateInput = Partial<Omit<ContactInput, "phoneNumber" | "priceTypeId">> & {
  priceTypeId?: string | null;
};

export const contactsApi = {
  async list(params: ListContactsParams = {}): Promise<ListContactsResponse> {
    const res = await api.get("/inbox/contacts", { params });
    return res.data;
  },
  async create(input: ContactInput): Promise<Contact> {
    const res = await api.post<{ contact: Contact }>("/inbox/contacts", input);
    return res.data.contact;
  },
  async update(id: string, input: ContactUpdateInput): Promise<Contact> {
    const res = await api.patch<{ contact: Contact }>(`/inbox/contacts/${id}`, input);
    return res.data.contact;
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/inbox/contacts/${id}`);
  },
  async batchUpdateStatus(input: { ids: string[]; status: string }): Promise<{ updated: number }> {
    const res = await api.patch("/inbox-contact-status/batch", input);
    return res.data;
  },
  async batchDelete(ids: string[]): Promise<{ deleted: number }> {
    const res = await api.patch("/inbox-contacts/batch-delete", { ids });
    return res.data;
  },
};
