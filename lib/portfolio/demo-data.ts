export type DemoConversation = {
  id: string;
  name: string;
  phone: string;
  preview: string;
  unread: number;
  aiHandled: boolean;
  selected?: boolean;
};

export type DemoMessage = {
  id: string;
  direction: "in" | "out";
  author: string;
  body: string;
  type?: "text" | "image";
};

export type DemoOrderItem = {
  name: string;
  qty: number;
  unitPrice: number;
};

export type DemoOrder = {
  id: string;
  orderNumber: string;
  contactName: string;
  contactPhone: string;
  status: "draft" | "processing" | "shipped" | "completed";
  paymentStatus: "unpaid" | "proof_submitted" | "verified" | "rejected";
  total: number;
  items: DemoOrderItem[];
  courier: string;
  trackingNumber?: string;
  createdAt: string;
};

export type DemoCatalogItem = {
  sku: string;
  name: string;
  description?: string;
  price: number;
  unit: string;
  isActive: boolean;
};

export type DemoPaymentProof = {
  orderNumber: string;
  amount: number;
  bankName: string;
  accountName: string;
  transferDate: string;
  confidence: number;
};

export const demoConversations: DemoConversation[] = [
  {
    id: "c1",
    name: "Sari Wijaya",
    phone: "+62 812 3456 7890",
    preview: "2 pcs please, deliver to Jakarta.",
    unread: 0,
    aiHandled: true,
    selected: true,
  },
  {
    id: "c2",
    name: "Budi Santoso",
    phone: "+62 813 9876 5432",
    preview: "Apakah Canvas Tote masih ready?",
    unread: 2,
    aiHandled: true,
  },
  {
    id: "c3",
    name: "Dewi Lestari",
    phone: "+62 856 1122 3344",
    preview: "Bukti transfer sudah saya kirim",
    unread: 1,
    aiHandled: false,
  },
];

export const demoMessages: DemoMessage[] = [
  {
    id: "m1",
    direction: "in",
    author: "customer",
    body: "Hi, is the linen shirt still available in size L?",
  },
  {
    id: "m2",
    direction: "out",
    author: "ai",
    body: "Yes — Linen Shirt (L) is in stock. Would you like to order?",
  },
  {
    id: "m3",
    direction: "in",
    author: "customer",
    body: "2 pcs please, deliver to Jakarta.",
  },
  {
    id: "m4",
    direction: "out",
    author: "ai",
    body: "Great. Please share recipient name and full shipping address.",
  },
];

export const demoOrders: DemoOrder[] = [
  {
    id: "o1",
    orderNumber: "WB-00001042",
    contactName: "Sari Wijaya",
    contactPhone: "+62 812 3456 7890",
    status: "draft",
    paymentStatus: "proof_submitted",
    total: 348_000,
    items: [
      { name: "Linen Shirt (L)", qty: 2, unitPrice: 174_000 },
    ],
    courier: "JNE REG",
    createdAt: "11 Jul 2026, 09:42",
  },
  {
    id: "o2",
    orderNumber: "WB-00001038",
    contactName: "Budi Santoso",
    contactPhone: "+62 813 9876 5432",
    status: "processing",
    paymentStatus: "verified",
    total: 89_000,
    items: [{ name: "Canvas Tote", qty: 1, unitPrice: 89_000 }],
    courier: "J&T EZ",
    trackingNumber: "JP1234567890",
    createdAt: "10 Jul 2026, 14:15",
  },
];

export const demoCatalogItems: DemoCatalogItem[] = [
  {
    sku: "LINEN-L",
    name: "Linen Shirt",
    description: "Breathable linen, size L. Used for catalog matching in chat.",
    price: 174_000,
    unit: "pcs",
    isActive: true,
  },
  {
    sku: "TOTE-01",
    name: "Canvas Tote",
    description: "Natural canvas tote bag.",
    price: 89_000,
    unit: "pcs",
    isActive: true,
  },
  {
    sku: "POLO-M",
    name: "Cotton Polo",
    description: "Classic fit polo, size M.",
    price: 129_000,
    unit: "pcs",
    isActive: false,
  },
];

export const demoPaymentProof: DemoPaymentProof = {
  orderNumber: "WB-00001042",
  amount: 348_000,
  bankName: "BCA",
  accountName: "Toko Linen Jaya",
  transferDate: "11 Jul 2026, 10:05",
  confidence: 0.94,
};

export function formatPortfolioRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}
