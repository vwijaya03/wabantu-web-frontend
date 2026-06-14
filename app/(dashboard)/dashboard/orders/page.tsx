"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, PlusCircle, RefreshCw, Search, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/dashboard/page-header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/components/providers/auth-provider";
import { canPerformOwnerActions } from "@/lib/api/auth";
import { toApiError } from "@/lib/api/client";
import { catalogApi, type CatalogItem, type ListCatalogResponse } from "@/lib/api/catalog";
import { contactsApi, type ListContactsResponse } from "@/lib/api/contacts";
import { priceTypesApi } from "@/lib/api/price-types";
import { ordersApi, type Order } from "@/lib/api/orders";
import { inventoryApi, type StockRow } from "@/lib/api/inventory";
import { WarehouseSelect } from "@/components/inventory/warehouse-select";
import { financeApi, type Wallet } from "@/lib/api/finance";
import { NO_WALLET } from "@/lib/finance/utils";
import { formatOrderNumber } from "@/lib/format-order-number";
import {
  formatOrderWarehouseSummary,
  normalizeLineWarehouses,
  warehouseLabel,
  warehouseNameMap,
} from "@/lib/orders/fulfillment";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const ALL = "__all__";
const pageSize = 25;
const selectorPageSize = 5;

const ORDER_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "processing", label: "Sedang diproses" },
  { value: "shipped", label: "Dalam pengiriman" },
  { value: "completed", label: "Selesai" },
  { value: "cancelled", label: "Dibatalkan" },
];

const ORDER_FORM_STEPS = [
  { value: "contact", label: "1. Contact" },
  { value: "items", label: "2. Produk & Gudang" },
  { value: "details", label: "3. Pengiriman & Bayar" },
] as const;

type OrderFormStep = (typeof ORDER_FORM_STEPS)[number]["value"];

type CreateForm = {
  contactId: string;
  contactSearch: string;
  catalogSearch: string;
  items: OrderItemForm[];
  quickExternalCode: string;
  quickName: string;
  quickPrice: string;
  quickUnit: string;
  notes: string;
  status: string;
  trackingNumber: string;
  courier: string;
  shippingCost: string;
  incomeWalletId: string;
  fulfillmentWarehouseId: string;
};

type OrderItemForm = {
  lineId: string;
  catalogItemId: string;
  externalCode: string;
  name: string;
  qty: string;
  unitPrice: string;
  sellUnit: string;
  warehouseId: string;
};

type EditForm = {
  contactId: string;
  contactSearch: string;
  catalogSearch: string;
  items: OrderItemForm[];
  notes: string;
  quickExternalCode: string;
  quickName: string;
  quickPrice: string;
  quickUnit: string;
  status: string;
  trackingNumber: string;
  courier: string;
  shippingCost: string;
  incomeWalletId: string;
  fulfillmentWarehouseId: string;
};

const emptyCreateForm: CreateForm = {
  contactId: "",
  contactSearch: "",
  catalogSearch: "",
  items: [],
  quickExternalCode: "",
  quickName: "",
  quickPrice: "",
  quickUnit: "pcs",
  notes: "",
  status: "draft",
  trackingNumber: "",
  courier: "",
  shippingCost: "",
  incomeWalletId: NO_WALLET,
  fulfillmentWarehouseId: "",
};

export default function OrdersPage() {
  const { user } = useAuth();
  const canManage = canPerformOwnerActions(user);
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(ALL);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchStatus, setBatchStatus] = useState("processing");
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(emptyCreateForm);
  const [createContactPage, setCreateContactPage] = useState(1);
  const [createCatalogPage, setCreateCatalogPage] = useState(1);
  const [editOrder, setEditOrder] = useState<Order | null>(null);
  const [editContactPage, setEditContactPage] = useState(1);
  const [editCatalogPage, setEditCatalogPage] = useState(1);
  const [editForm, setEditForm] = useState<EditForm>({
    contactId: "",
    contactSearch: "",
    catalogSearch: "",
    items: [],
    notes: "",
    quickExternalCode: "",
    quickName: "",
    quickPrice: "",
    quickUnit: "pcs",
    status: "processing",
    trackingNumber: "",
    courier: "",
    shippingCost: "",
    incomeWalletId: NO_WALLET,
    fulfillmentWarehouseId: "",
  });

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["orders", search, status, page, pageSize],
    queryFn: () =>
      ordersApi.list({
        q: search || undefined,
        status: status === ALL ? undefined : status,
        page,
        pageSize,
      }),
  });
  const { data: contactOptions } = useQuery({
    queryKey: ["order-contact-options", createForm.contactSearch, createContactPage, selectorPageSize],
    queryFn: () =>
      contactsApi.list({
        q: createForm.contactSearch || undefined,
        page: createContactPage,
        pageSize: selectorPageSize,
      }),
    enabled: createOpen,
  });
  const { data: editContactOptions } = useQuery({
    queryKey: ["order-edit-contact-options", editForm.contactSearch, editContactPage, selectorPageSize],
    queryFn: () =>
      contactsApi.list({
        q: editForm.contactSearch || undefined,
        page: editContactPage,
        pageSize: selectorPageSize,
      }),
    enabled: Boolean(editOrder),
  });
  const { data: catalogOptions } = useQuery({
    queryKey: ["order-catalog-options", createForm.catalogSearch, createForm.contactId, createCatalogPage, selectorPageSize],
    queryFn: () =>
      catalogApi.list({
        q: createForm.catalogSearch || undefined,
        page: createCatalogPage,
        pageSize: selectorPageSize,
        activeOnly: true,
        contactId: optionalString(createForm.contactId),
      }),
    enabled: createOpen,
  });
  const { data: editCatalogOptions } = useQuery({
    queryKey: ["order-edit-catalog-options", editForm.catalogSearch, editForm.contactId, editCatalogPage, selectorPageSize],
    queryFn: () =>
      catalogApi.list({
        q: editForm.catalogSearch || undefined,
        page: editCatalogPage,
        pageSize: selectorPageSize,
        activeOnly: true,
        contactId: optionalString(editForm.contactId),
      }),
    enabled: Boolean(editOrder),
  });
  const { data: priceTypesData } = useQuery({
    queryKey: ["price-types", "orders"],
    queryFn: () => priceTypesApi.list({ pageSize: 50 }),
    enabled: createOpen || Boolean(editOrder),
  });
  const { data: walletsData } = useQuery({
    queryKey: ["finance-wallets", "orders"],
    queryFn: () => financeApi.listWallets(),
    enabled: createOpen || Boolean(editOrder),
  });
  const walletOptions = useMemo(
    () => (walletsData?.wallets ?? []).filter((wallet) => wallet.isActive),
    [walletsData],
  );
  const priceTypeLabelById = useMemo(
    () => new Map((priceTypesData?.items ?? []).map((pt) => [pt.id, pt.label])),
    [priceTypesData],
  );

  // Inventory: flag orders whose tracked items lack enough stock (exception-only badge).
  const { data: invSetting } = useQuery({
    queryKey: ["inventory", "setting"],
    queryFn: () => inventoryApi.getSetting(),
  });
  const inventoryOn = Boolean(invSetting?.setupCompleted);
  const { data: warehousesData } = useQuery({
    queryKey: ["inventory", "warehouses"],
    queryFn: () => inventoryApi.listWarehouses(),
  });
  const warehouses = useMemo(() => warehousesData?.warehouses ?? [], [warehousesData]);
  const hasWarehouses = warehouses.length > 0;
  const warehouseNames = useMemo(() => warehouseNameMap(warehouses), [warehouses]);
  const defaultWarehouseId = useMemo(() => {
    return warehouses.find((w) => w.isDefault)?.id ?? warehouses[0]?.id ?? "";
  }, [warehouses]);
  const { data: stockOverview } = useQuery({
    queryKey: ["inventory", "stock", "orders-overview"],
    queryFn: () => inventoryApi.listStock({ pageSize: 500 }),
    enabled: inventoryOn,
  });
  const stockRows = stockOverview?.stock ?? [];

  const orders = data?.orders ?? [];
  const total = data?.total ?? 0;
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total]);
  const visibleIds = orders.map((order) => order.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));

  const invalidateOrders = () => {
    void qc.invalidateQueries({ queryKey: ["orders"] });
  };

  const createMut = useMutation({
    mutationFn: () => {
      const fallbackWh = createForm.fulfillmentWarehouseId || defaultWarehouseId;
      const items = normalizeLineWarehouses(createForm.items, fallbackWh);
      if (hasWarehouses && items.some((item) => !item.warehouseId)) {
        throw new Error("Pilih gudang untuk setiap item pesanan");
      }
      return ordersApi.create({
        items: items.map((item) => toOrderItemPayload(item, fallbackWh)),
        contactId: optionalString(createForm.contactId),
        notes: optionalString(createForm.notes),
        status: createForm.status,
        trackingNumber: optionalString(createForm.trackingNumber),
        courier: optionalString(createForm.courier),
        shippingCost: optionalNumber(createForm.shippingCost),
        incomeWalletId:
          createForm.incomeWalletId && createForm.incomeWalletId !== NO_WALLET
            ? createForm.incomeWalletId
            : undefined,
      });
    },
    onSuccess: () => {
      toast.success("Pesanan ditambahkan");
      setCreateForm(emptyCreateForm);
      setCreateOpen(false);
      setPage(1);
      invalidateOrders();
    },
    onError: (e) => toast.error(toApiError(e).message),
  });
  const quickCreateCatalogMut = useMutation({
    mutationFn: () =>
      catalogApi.create({
        externalCode: createForm.quickExternalCode.trim() || `MANUAL-${Date.now()}`,
        name: createForm.quickName.trim(),
        sellPrice: optionalNumber(createForm.quickPrice),
        sellUnit: optionalString(createForm.quickUnit),
        isActive: true,
      }),
    onSuccess: (item) => {
      toast.success("Produk katalog dibuat dan ditambahkan ke pesanan");
      addCatalogItem(item);
      setCreateForm((form) => ({
        ...form,
        quickExternalCode: "",
        quickName: "",
        quickPrice: "",
        quickUnit: "pcs",
      }));
      void qc.invalidateQueries({ queryKey: ["catalog"] });
    },
    onError: (e) => toast.error(toApiError(e).message),
  });
  const quickCreateEditCatalogMut = useMutation({
    mutationFn: () =>
      catalogApi.create({
        externalCode: editForm.quickExternalCode.trim() || `MANUAL-${Date.now()}`,
        name: editForm.quickName.trim(),
        sellPrice: optionalNumber(editForm.quickPrice),
        sellUnit: optionalString(editForm.quickUnit),
        isActive: true,
      }),
    onSuccess: (item) => {
      toast.success("Produk katalog dibuat dan ditambahkan ke pesanan");
      addCatalogItemToEdit(item);
      setEditForm((form) => ({
        ...form,
        quickExternalCode: "",
        quickName: "",
        quickPrice: "",
        quickUnit: "pcs",
      }));
      void qc.invalidateQueries({ queryKey: ["catalog"] });
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const updateMut = useMutation({
    mutationFn: () => {
      const fallbackWh = editForm.fulfillmentWarehouseId || defaultWarehouseId;
      const items = normalizeLineWarehouses(editForm.items, fallbackWh);
      if (hasWarehouses && items.some((item) => !item.warehouseId)) {
        throw new Error("Pilih gudang untuk setiap item pesanan");
      }
      return ordersApi.update(editOrder!.id, {
        contactId: editForm.contactId.trim(),
        notes: editForm.notes.trim(),
        items: items.map((item) => toOrderItemPayload(item, fallbackWh)),
        status: editForm.status,
        trackingNumber: optionalString(editForm.trackingNumber),
        courier: optionalString(editForm.courier),
        shippingCost: optionalNumber(editForm.shippingCost),
        incomeWalletId:
          editForm.incomeWalletId && editForm.incomeWalletId !== NO_WALLET
            ? editForm.incomeWalletId
            : "",
      });
    },
    onSuccess: () => {
      toast.success("Pesanan diperbarui");
      setEditOrder(null);
      invalidateOrders();
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const batchMut = useMutation({
    mutationFn: () =>
      ordersApi.batchUpdateStatus({
        ids: Array.from(selectedIds),
        status: batchStatus,
      }),
    onSuccess: (res) => {
      toast.success(`${res.updated} pesanan diperbarui`);
      setSelectedIds(new Set());
      invalidateOrders();
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => ordersApi.remove(id),
    onSuccess: () => {
      toast.success("Pesanan dihapus");
      setSelectedIds(new Set());
      invalidateOrders();
    },
    onError: (e) => toast.error(toApiError(e).message),
  });
  const batchDeleteMut = useMutation({
    mutationFn: () => ordersApi.batchDelete(Array.from(selectedIds)),
    onSuccess: (res) => {
      toast.success(`${res.deleted} pesanan dihapus`);
      setSelectedIds(new Set());
      invalidateOrders();
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const runSearch = () => {
    setSearch(q.trim());
    setPage(1);
    setSelectedIds(new Set());
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectVisible = () => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allVisibleSelected) {
        visibleIds.forEach((id) => next.delete(id));
      } else {
        visibleIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const openEdit = (order: Order) => {
    setEditOrder(order);
    setEditContactPage(1);
    setEditCatalogPage(1);
    setEditForm({
      contactId: order.contactId ?? "",
      contactSearch: "",
      catalogSearch: "",
      items: order.items.map((item) => ({
        lineId: item.lineId ?? "",
        catalogItemId: item.catalogItemId ?? "",
        externalCode: item.externalCode ?? "",
        name: item.name,
        qty: String(item.qty || 1),
        unitPrice: String(item.unitPrice || 0),
        sellUnit: item.sellUnit ?? "",
        warehouseId: item.warehouseId ?? "",
      })),
      notes: order.notes ?? "",
      quickExternalCode: "",
      quickName: "",
      quickPrice: "",
      quickUnit: "pcs",
      status: normalizeEditableStatus(order.status),
      trackingNumber: order.trackingNumber ?? "",
      courier: order.courier ?? "",
      shippingCost: order.shippingCost ? String(order.shippingCost) : "",
      incomeWalletId: order.incomeWalletId || NO_WALLET,
      fulfillmentWarehouseId:
        order.items.find((item) => item.warehouseId)?.warehouseId ?? defaultWarehouseId,
    });
  };

  const repriceCreateItems = async (contactId: string) => {
    const hasCatalogItems = createForm.items.some((item) => item.catalogItemId);
    if (!hasCatalogItems) {
      setCreateForm((form) => ({ ...form, contactId }));
      return;
    }
    const res = await catalogApi.list({
      contactId: optionalString(contactId),
      pageSize: 100,
      activeOnly: true,
    });
    const priceMap = new Map(res.items.map((item) => [item.id, catalogDisplayPrice(item)]));
    setCreateForm((form) => ({
      ...form,
      contactId,
      items: form.items.map((item) => {
        if (!item.catalogItemId) return item;
        const price = priceMap.get(item.catalogItemId);
        return price == null ? item : { ...item, unitPrice: String(price) };
      }),
    }));
  };

  const repriceEditItems = async (contactId: string) => {
    const catalogIds = editForm.items.map((item) => item.catalogItemId).filter(Boolean);
    if (catalogIds.length === 0) {
      setEditForm((form) => ({ ...form, contactId }));
      return;
    }
    const res = await catalogApi.list({
      contactId: optionalString(contactId),
      pageSize: 100,
      activeOnly: true,
    });
    const priceMap = new Map(res.items.map((item) => [item.id, catalogDisplayPrice(item)]));
    setEditForm((form) => ({
      ...form,
      contactId,
      items: form.items.map((item) => {
        if (!item.catalogItemId) return item;
        const price = priceMap.get(item.catalogItemId);
        return price == null ? item : { ...item, unitPrice: String(price) };
      }),
    }));
  };

  const addCatalogItem = (item: CatalogItem) => {
    const wh = createForm.fulfillmentWarehouseId || defaultWarehouseId;
    setCreateForm((form) => {
      if (form.items.some((row) => row.catalogItemId === item.id)) return form;
      return {
        ...form,
        items: [
          ...form.items,
          {
            lineId: "",
            catalogItemId: item.id,
            externalCode: item.externalCode,
            name: item.name,
            qty: "1",
            unitPrice: String(catalogDisplayPrice(item)),
            sellUnit: item.sellUnit ?? "",
            warehouseId: wh,
          },
        ],
      };
    });
  };

  const addCatalogItemToEdit = (item: CatalogItem) => {
    const wh = editForm.fulfillmentWarehouseId || defaultWarehouseId;
    setEditForm((form) => {
      if (form.items.some((row) => row.catalogItemId === item.id)) return form;
      return {
        ...form,
        items: [
          ...form.items,
          {
            lineId: "",
            catalogItemId: item.id,
            externalCode: item.externalCode,
            name: item.name,
            qty: "1",
            unitPrice: String(catalogDisplayPrice(item)),
            sellUnit: item.sellUnit ?? "",
            warehouseId: wh,
          },
        ],
      };
    });
  };

  const updateOrderItem = (index: number, patch: Partial<OrderItemForm>) => {
    setCreateForm((form) => ({
      ...form,
      items: form.items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));
  };

  const removeOrderItem = (index: number) => {
    setCreateForm((form) => ({
      ...form,
      items: form.items.filter((_, i) => i !== index),
    }));
  };

  const updateEditOrderItem = (index: number, patch: Partial<OrderItemForm>) => {
    setEditForm((form) => ({
      ...form,
      items: form.items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));
  };

  const removeEditOrderItem = (index: number) => {
    setEditForm((form) => ({
      ...form,
      items: form.items.filter((_, i) => i !== index),
    }));
  };

  return (
    <>
      <PageHeader
        title="Pesanan"
        description="Kelola pesanan dari WhatsApp atau input manual, termasuk update status satuan dan batch."
        actions={
          <Button
            onClick={() => {
              setCreateContactPage(1);
              setCreateCatalogPage(1);
              setCreateForm({ ...emptyCreateForm, fulfillmentWarehouseId: defaultWarehouseId });
              setCreateOpen(true);
            }}
            disabled={!canManage}
          >
            <PlusCircle className="h-4 w-4" /> Tambah Pesanan
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <CardTitle>Daftar pesanan ({total})</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Search dan pagination berjalan dari server agar aman untuk data besar.
              </p>
            </div>
            <div className="flex flex-col gap-2 lg:flex-row">
              <div className="relative min-w-0 lg:w-80">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") runSearch();
                  }}
                  placeholder="Cari produk, nama kontak, no resi..."
                />
              </div>
              <Select
                value={status}
                onValueChange={(value) => {
                  setStatus(value);
                  setPage(1);
                  setSelectedIds(new Set());
                }}
              >
                <SelectTrigger className="lg:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Semua status</SelectItem>
                  {ORDER_STATUSES.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="secondary" onClick={runSearch}>
                Cari
              </Button>
              <Button
                variant="outline"
                onClick={() => void refetch()}
                disabled={isFetching}
                aria-label="Refresh daftar pesanan"
              >
                <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {selectedIds.size > 0 && (
            <div className="mb-4 flex flex-col gap-2 rounded-lg border bg-muted/40 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <span>{selectedIds.size} pesanan dipilih</span>
              <div className="flex gap-2">
                <Select value={batchStatus} onValueChange={setBatchStatus}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ORDER_STATUSES.filter((option) => option.value !== "draft").map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button disabled={!canManage || batchMut.isPending} onClick={() => batchMut.mutate()}>
                  Update Batch
                </Button>
                <Button
                  variant="destructive"
                  disabled={!canManage || batchDeleteMut.isPending}
                  onClick={() => {
                    if (confirm(`Hapus ${selectedIds.size} pesanan terpilih?`)) batchDeleteMut.mutate();
                  }}
                >
                  Hapus Batch
                </Button>
              </div>
            </div>
          )}

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Memuat...</p>
          ) : orders.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
              Belum ada pesanan yang cocok.
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <div className="grid grid-cols-[40px_minmax(180px,1fr)_minmax(130px,0.75fr)_120px_130px_90px] gap-3 border-b bg-muted/60 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground max-lg:hidden">
                <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectVisible} aria-label="Pilih semua pesanan" />
                <span>Pesanan</span>
                <span>Pembeli</span>
                <span>Status</span>
                <span>Total</span>
                <span className="text-right">Aksi</span>
              </div>
              <div className="max-h-[640px] divide-y overflow-auto">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="grid gap-3 px-4 py-3 text-sm lg:grid-cols-[40px_minmax(180px,1fr)_minmax(130px,0.75fr)_120px_130px_90px] lg:items-center"
                  >
                    <input
                      type="checkbox"
                      className="mt-1 lg:mt-0"
                      checked={selectedIds.has(order.id)}
                      onChange={() => toggleSelected(order.id)}
                      aria-label={`Pilih pesanan ${formatOrderNumber(order.id)}`}
                    />
                    <div className="min-w-0">
                      <button
                        type="button"
                        className="block w-full truncate text-left font-medium text-primary underline-offset-4 hover:underline"
                        onClick={() => openEdit(order)}
                        aria-label={`Lihat detail pesanan ${formatOrderNumber(order.id)}`}
                      >
                        {formatOrderNumber(order.id)} · {order.items.map((item) => item.name).join(", ") || "Tanpa item"}
                      </button>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {order.trackingNumber ? `Resi ${order.trackingNumber}` : "Belum ada resi"}
                        {order.courier ? ` · ${order.courier}` : ""}
                      </p>
                      {hasWarehouses ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Gudang: {formatOrderWarehouseSummary(order, warehouseNames, defaultWarehouseId) || "—"}
                        </p>
                      ) : null}
                      {inventoryOn && orderHasInsufficientStock(order, stockRows, defaultWarehouseId) ? (
                        <p className="mt-1">
                          <Badge variant="warning">Stok kurang</Badge>
                        </p>
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground lg:hidden">Pembeli</p>
                      <p className="truncate font-medium">{formatBuyerLabel(order)}</p>
                      {normalizeBuyerField(order.contactDisplayName) && normalizeBuyerField(order.contactPhone) ? (
                        <p className="mt-1 truncate text-xs text-muted-foreground">{order.contactPhone}</p>
                      ) : null}
                    </div>
                    <Badge variant={statusBadgeVariant(order.status)}>{statusLabel(order.status)}</Badge>
                    <div>
                      <p>{formatRupiah(order.total)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.createdAt).toLocaleString("id-ID")}
                      </p>
                    </div>
                    <div className="flex justify-start gap-1 lg:justify-end">
                      <Button variant="outline" size="sm" disabled={!canManage} onClick={() => openEdit(order)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={!canManage}
                        className="text-destructive"
                        onClick={() => {
                          if (confirm(`Hapus pesanan ${formatOrderNumber(order.id)}?`)) deleteMut.mutate(order.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <span className="text-muted-foreground">
              {total === 0
                ? "0 pesanan"
                : `Menampilkan ${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, total)} dari ${total} pesanan`}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Berikutnya
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[92vh] max-w-6xl overflow-hidden p-0">
          <DialogHeader className="border-b px-6 pb-4 pt-6">
            <DialogTitle>Tambah Pesanan</DialogTitle>
            <DialogDescription>
              Pilih contact jika ada, lalu tambah satu atau beberapa item dari Katalog Produk.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[calc(92vh-180px)] overflow-y-auto px-6 py-4">
            <OrderCreateForm
              form={createForm}
              setForm={setCreateForm}
              showOperationalFields
              contactOptions={contactOptions}
              contactPage={createContactPage}
              setContactPage={setCreateContactPage}
              catalogOptions={catalogOptions}
              catalogPage={createCatalogPage}
              setCatalogPage={setCreateCatalogPage}
              addCatalogItem={addCatalogItem}
              updateOrderItem={updateOrderItem}
              removeOrderItem={removeOrderItem}
              quickCreateCatalog={() => quickCreateCatalogMut.mutate()}
              quickCreatePending={quickCreateCatalogMut.isPending}
              priceTypeLabelById={priceTypeLabelById}
              walletOptions={walletOptions}
              inventoryOn={inventoryOn}
              hasWarehouses={hasWarehouses}
              defaultWarehouseId={defaultWarehouseId}
              warehouseNames={warehouseNames}
              onContactSelect={(contactId) => {
                void repriceCreateItems(contactId);
              }}
            />
          </div>
          <DialogFooter className="border-t px-6 py-4">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={() => createMut.mutate()}
              disabled={createForm.items.length === 0 || createMut.isPending}
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editOrder} onOpenChange={(open) => !open && setEditOrder(null)}>
        <DialogContent className="max-h-[92vh] max-w-6xl overflow-hidden p-0">
          <DialogHeader className="border-b px-6 pb-4 pt-6">
            <DialogTitle>
              Detail Pesanan · {editOrder ? (editOrder.orderNumber ?? formatOrderNumber(editOrder.id)) : ""}
            </DialogTitle>
            <DialogDescription>
              Nomor pesanan {editOrder ? (editOrder.orderNumber ?? formatOrderNumber(editOrder.id)) : ""} — update contact, item, status, kurir, resi, ongkir, dan catatan.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[calc(92vh-180px)] overflow-y-auto px-6 py-4">
            <OrderEditForm
              form={editForm}
              setForm={setEditForm}
              contactOptions={editContactOptions}
              contactPage={editContactPage}
              setContactPage={setEditContactPage}
              catalogOptions={editCatalogOptions}
              catalogPage={editCatalogPage}
              setCatalogPage={setEditCatalogPage}
              addCatalogItem={addCatalogItemToEdit}
              updateOrderItem={updateEditOrderItem}
              removeOrderItem={removeEditOrderItem}
              quickCreateCatalog={() => quickCreateEditCatalogMut.mutate()}
              quickCreatePending={quickCreateEditCatalogMut.isPending}
              priceTypeLabelById={priceTypeLabelById}
              walletOptions={walletOptions}
              inventoryOn={inventoryOn}
              hasWarehouses={hasWarehouses}
              defaultWarehouseId={defaultWarehouseId}
              warehouseNames={warehouseNames}
              onContactSelect={(contactId) => {
                void repriceEditItems(contactId);
              }}
            />
          </div>
          <DialogFooter className="border-t px-6 py-4">
            <Button variant="outline" onClick={() => setEditOrder(null)}>
              Batal
            </Button>
            <Button onClick={() => updateMut.mutate()} disabled={editForm.items.length === 0 || updateMut.isPending}>
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function OrderCreateForm({
  form,
  setForm,
  showOperationalFields = false,
  contactOptions,
  contactPage,
  setContactPage,
  catalogOptions,
  catalogPage,
  setCatalogPage,
  addCatalogItem,
  updateOrderItem,
  removeOrderItem,
  quickCreateCatalog,
  quickCreatePending,
  priceTypeLabelById,
  walletOptions,
  inventoryOn = false,
  hasWarehouses = false,
  defaultWarehouseId = "",
  warehouseNames,
  onContactSelect,
}: {
  form: CreateForm;
  setForm: (form: CreateForm) => void;
  showOperationalFields?: boolean;
  contactOptions?: ListContactsResponse;
  contactPage: number;
  setContactPage: (page: number) => void;
  catalogOptions?: ListCatalogResponse;
  catalogPage: number;
  setCatalogPage: (page: number) => void;
  addCatalogItem: (item: CatalogItem) => void;
  updateOrderItem: (index: number, patch: Partial<OrderItemForm>) => void;
  removeOrderItem: (index: number) => void;
  quickCreateCatalog: () => void;
  quickCreatePending: boolean;
  priceTypeLabelById: Map<string, string>;
  walletOptions: Wallet[];
  inventoryOn?: boolean;
  hasWarehouses?: boolean;
  defaultWarehouseId?: string;
  warehouseNames: Map<string, string>;
  onContactSelect: (contactId: string) => void;
}) {
  const update = (patch: Partial<CreateForm>) => setForm({ ...form, ...patch });
  const subtotal = calculateItemsSubtotal(form.items);
  const shippingCost = optionalNumber(form.shippingCost) ?? 0;
  const total = subtotal + shippingCost;
  const [activeStep, setActiveStep] = useState<OrderFormStep>("contact");
  const contacts = contactOptions?.items ?? [];
  const catalogItems = catalogOptions?.items ?? [];
  const contactTotalPages = Math.max(1, Math.ceil((contactOptions?.total ?? 0) / selectorPageSize));
  const catalogTotalPages = Math.max(1, Math.ceil((catalogOptions?.total ?? 0) / selectorPageSize));
  const selectedContact = contacts.find((contact) => contact.id === form.contactId);
  const selectedPriceTypeLabel = selectedContact?.priceTypeId
    ? priceTypeLabelById.get(selectedContact.priceTypeId) ?? "Kustom"
    : "Harga umum (default)";

  const contactSummaryLabel = selectedContact
    ? `${selectedContact.displayName || selectedContact.phoneNumber} · ${selectedPriceTypeLabel}`
    : form.contactId
      ? "Contact terpilih"
      : "Tanpa contact";

  const applyFulfillmentToAll = () => {
    const wh = form.fulfillmentWarehouseId || defaultWarehouseId;
    if (!wh) return;
    update({
      items: form.items.map((item) => ({ ...item, warehouseId: wh })),
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-2 rounded-xl bg-muted/40 p-2 sm:grid-cols-3">
        {ORDER_FORM_STEPS.map((step) => (
          <button
            key={step.value}
            type="button"
            onClick={() => setActiveStep(step.value)}
            className={cn(
              "rounded-lg px-3 py-2 text-left text-sm font-medium transition",
              activeStep === step.value ? "bg-background shadow-sm" : "text-muted-foreground hover:bg-background/60",
            )}
          >
            {step.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-4">
          {activeStep === "contact" && (
            <div className="rounded-lg border p-4">
              <div className="mb-3">
                <h3 className="font-medium">Pilih contact</h3>
                <p className="text-sm text-muted-foreground">Boleh pilih contact yang sudah ada, atau lanjut tanpa contact.</p>
              </div>
              <Input
                value={form.contactSearch}
                onChange={(e) => {
                  update({ contactSearch: e.target.value });
                  setContactPage(1);
                }}
                placeholder="Cari nama atau nomor..."
              />
              <div className="mt-3 grid gap-2">
                <button
                  type="button"
                  onClick={() => onContactSelect("")}
                  className={cn(
                    "rounded-md border px-3 py-3 text-left text-sm",
                    form.contactId === "" && "border-primary bg-primary/5",
                  )}
                >
                  Tanpa contact
                  <span className="block text-xs text-muted-foreground">Pakai harga umum (default).</span>
                </button>
                {contacts.map((contact) => {
                  const priceLabel = contact.priceTypeId
                    ? priceTypeLabelById.get(contact.priceTypeId) ?? "Kustom"
                    : "Harga umum";
                  return (
                  <button
                    key={contact.id}
                    type="button"
                    onClick={() => onContactSelect(contact.id)}
                    className={cn(
                      "rounded-md border px-3 py-3 text-left text-sm hover:bg-muted/60",
                      form.contactId === contact.id && "border-primary bg-primary/5",
                    )}
                  >
                    <span className="font-medium">{contact.displayName || contact.phoneNumber}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{contact.phoneNumber}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {contact.status} · {priceLabel}
                    </span>
                  </button>
                  );
                })}
              </div>
              <SelectorPagination
                className="mt-3"
                page={contactPage}
                total={contactOptions?.total ?? 0}
                totalPages={contactTotalPages}
                onPageChange={setContactPage}
              />
            </div>
          )}

          {activeStep === "items" && (
            <div className="space-y-4">
              {hasWarehouses ? (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <div className="mb-3">
                    <h3 className="font-medium">Gudang pengambilan stok</h3>
                    <p className="text-sm text-muted-foreground">
                      Tentukan dari gudang mana setiap item diambil. Baris baru mengikuti gudang default di bawah.
                      {!inventoryOn ? (
                        <span className="mt-1 block text-amber-800">
                          Stok belum dipotong sampai setup persediaan selesai — gudang tetap disimpan untuk pesanan ini.
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="min-w-[200px] flex-1 space-y-1.5">
                      <Label>Gudang default</Label>
                      <WarehouseSelect
                        value={form.fulfillmentWarehouseId}
                        onChange={(fulfillmentWarehouseId) => update({ fulfillmentWarehouseId })}
                      />
                    </div>
                    <Button type="button" variant="outline" onClick={applyFulfillmentToAll} disabled={form.items.length === 0}>
                      Terapkan ke semua baris
                    </Button>
                  </div>
                </div>
              ) : null}

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
              <div className="rounded-lg border p-4">
                <div className="mb-3">
                  <h3 className="font-medium">Pilih item katalog</h3>
                  <p className="text-sm text-muted-foreground">
                    Harga produk mengikuti tipe harga contact: <span className="font-medium text-foreground">{selectedPriceTypeLabel}</span>
                  </p>
                </div>
                <Input
                  value={form.catalogSearch}
                  onChange={(e) => {
                    update({ catalogSearch: e.target.value });
                    setCatalogPage(1);
                  }}
                  placeholder="Cari nama produk / SKU..."
                />
                <div className="mt-3 space-y-2">
                  {catalogItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => addCatalogItem(item)}
                      className="flex w-full min-w-0 items-center justify-between gap-3 rounded-md border px-3 py-3 text-left text-sm hover:bg-muted/60"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{item.name}</span>
                        <span className="text-xs text-muted-foreground">{item.externalCode}</span>
                      </span>
                      <span className="shrink-0 text-xs">{formatRupiah(catalogDisplayPrice(item))}</span>
                    </button>
                  ))}
                  {catalogItems.length === 0 && (
                    <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                      Produk tidak ditemukan di halaman ini.
                    </p>
                  )}
                </div>
                <SelectorPagination
                  className="mt-3"
                  page={catalogPage}
                  total={catalogOptions?.total ?? 0}
                  totalPages={catalogTotalPages}
                  onPageChange={setCatalogPage}
                />

                <div className="mt-4 rounded-md bg-muted/40 p-3">
                  <p className="mb-2 text-sm font-medium">Produk belum ada? Buat cepat di katalog</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input
                      value={form.quickExternalCode}
                      onChange={(e) => update({ quickExternalCode: e.target.value })}
                      placeholder="SKU opsional"
                    />
                    <Input
                      value={form.quickName}
                      onChange={(e) => update({ quickName: e.target.value })}
                      placeholder="Nama produk"
                    />
                    <Input
                      value={form.quickPrice}
                      onChange={(e) => update({ quickPrice: e.target.value })}
                      type="number"
                      min="0"
                      placeholder="Harga"
                    />
                    <Input
                      value={form.quickUnit}
                      onChange={(e) => update({ quickUnit: e.target.value })}
                      placeholder="Satuan"
                    />
                  </div>
                  <Button
                    type="button"
                    className="mt-2"
                    variant="secondary"
                    disabled={!form.quickName.trim() || quickCreatePending}
                    onClick={quickCreateCatalog}
                  >
                    Buat Produk & Tambahkan
                  </Button>
                </div>
              </div>

              <SelectedItemsPanel
                items={form.items}
                subtotal={subtotal}
                updateOrderItem={updateOrderItem}
                removeOrderItem={removeOrderItem}
                showWarehouse={hasWarehouses}
                defaultWarehouseId={form.fulfillmentWarehouseId || defaultWarehouseId}
                warehouseNames={warehouseNames}
              />
            </div>
            </div>
          )}

          {activeStep === "details" && (
            <div className="space-y-4">
              {showOperationalFields && (
                <div className="rounded-lg border p-4">
                  <h3 className="mb-3 font-medium">Status & pengiriman</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label>Status</Label>
                      <Select value={form.status} onValueChange={(value) => update({ status: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ORDER_STATUSES.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Ongkir</Label>
                      <Input
                        value={form.shippingCost}
                        onChange={(e) => update({ shippingCost: e.target.value })}
                        type="number"
                        min="0"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label>Kurir</Label>
                      <Input value={form.courier} onChange={(e) => update({ courier: e.target.value })} placeholder="JNE / J&T" />
                    </div>
                    <div>
                      <Label>No. resi</Label>
                      <Input value={form.trackingNumber} onChange={(e) => update({ trackingNumber: e.target.value })} />
                    </div>
                  </div>
                </div>
              )}
              {showOperationalFields && (
                <div className="rounded-lg border p-4">
                  <h3 className="mb-1 font-medium">Pembayaran</h3>
                  <p className="mb-3 text-sm text-muted-foreground">
                    Dompet tujuan pemasukan saat pesanan diselesaikan — terpisah dari logistik pengiriman.
                  </p>
                  <div className="space-y-1.5">
                    <Label>Dompet pemasukan</Label>
                    <Select
                      value={form.incomeWalletId}
                      onValueChange={(value) => update({ incomeWalletId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Dompet default" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_WALLET}>Dompet default (Kas Tunai)</SelectItem>
                        {walletOptions.map((wallet) => (
                          <SelectItem key={wallet.id} value={wallet.id}>
                            {wallet.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Kosongkan untuk dompet default aktif tenant.
                    </p>
                  </div>
                </div>
              )}
              <div className="rounded-lg border p-4">
                <Label>Catatan</Label>
                <Textarea value={form.notes} onChange={(e) => update({ notes: e.target.value })} rows={4} />
              </div>
            </div>
          )}
        </div>

        <OrderSummary
          contactLabel={contactSummaryLabel}
          items={form.items}
          warehouseNames={warehouseNames}
          fulfillmentWarehouseId={form.fulfillmentWarehouseId || defaultWarehouseId}
          hasWarehouses={hasWarehouses}
          subtotal={subtotal}
          shippingCost={shippingCost}
          total={total}
          onStepChange={setActiveStep}
        />
      </div>
    </div>
  );
}

function OrderEditForm({
  form,
  setForm,
  contactOptions,
  contactPage,
  setContactPage,
  catalogOptions,
  catalogPage,
  setCatalogPage,
  addCatalogItem,
  updateOrderItem,
  removeOrderItem,
  quickCreateCatalog,
  quickCreatePending,
  priceTypeLabelById,
  walletOptions,
  inventoryOn = false,
  hasWarehouses = false,
  defaultWarehouseId = "",
  warehouseNames,
  onContactSelect,
}: {
  form: EditForm;
  setForm: (form: EditForm) => void;
  contactOptions?: ListContactsResponse;
  contactPage: number;
  setContactPage: (page: number) => void;
  catalogOptions?: ListCatalogResponse;
  catalogPage: number;
  setCatalogPage: (page: number) => void;
  addCatalogItem: (item: CatalogItem) => void;
  updateOrderItem: (index: number, patch: Partial<OrderItemForm>) => void;
  removeOrderItem: (index: number) => void;
  quickCreateCatalog: () => void;
  quickCreatePending: boolean;
  priceTypeLabelById: Map<string, string>;
  walletOptions: Wallet[];
  inventoryOn?: boolean;
  hasWarehouses?: boolean;
  defaultWarehouseId?: string;
  warehouseNames: Map<string, string>;
  onContactSelect: (contactId: string) => void;
}) {
  return (
    <OrderCreateForm
      form={form}
      setForm={(nextForm) => setForm({ ...form, ...nextForm })}
      showOperationalFields
      contactOptions={contactOptions}
      contactPage={contactPage}
      setContactPage={setContactPage}
      catalogOptions={catalogOptions}
      catalogPage={catalogPage}
      setCatalogPage={setCatalogPage}
      addCatalogItem={addCatalogItem}
      updateOrderItem={updateOrderItem}
      removeOrderItem={removeOrderItem}
      quickCreateCatalog={quickCreateCatalog}
      quickCreatePending={quickCreatePending}
      priceTypeLabelById={priceTypeLabelById}
      walletOptions={walletOptions}
      inventoryOn={inventoryOn}
      hasWarehouses={hasWarehouses}
      defaultWarehouseId={defaultWarehouseId}
      warehouseNames={warehouseNames}
      onContactSelect={onContactSelect}
    />
  );
}

function SelectorPagination({
  page,
  total,
  totalPages,
  onPageChange,
  className,
}: {
  page: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between", className)}>
      <span>
        {total === 0 ? "0 data" : `Halaman ${page} dari ${totalPages} · ${total} data`}
      </span>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          Sebelumnya
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        >
          Berikutnya
        </Button>
      </div>
    </div>
  );
}

function SelectedItemsPanel({
  items,
  subtotal,
  updateOrderItem,
  removeOrderItem,
  showWarehouse = false,
  defaultWarehouseId = "",
  warehouseNames,
}: {
  items: OrderItemForm[];
  subtotal: number;
  updateOrderItem: (index: number, patch: Partial<OrderItemForm>) => void;
  removeOrderItem: (index: number) => void;
  showWarehouse?: boolean;
  defaultWarehouseId?: string;
  warehouseNames: Map<string, string>;
}) {
  const applyDefaultWarehouse = () => {
    if (!defaultWarehouseId) return;
    items.forEach((item, index) => {
      if (!item.warehouseId) updateOrderItem(index, { warehouseId: defaultWarehouseId });
    });
  };

  return (
    <div className="rounded-lg border p-4">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-medium">Item pesanan</h3>
          <p className="text-sm text-muted-foreground">
            {showWarehouse
              ? "Pilih gudang pengambilan stok per baris sebelum simpan."
              : "Review item yang sudah dipilih sebelum simpan."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {showWarehouse && defaultWarehouseId ? (
            <Button type="button" variant="outline" size="sm" onClick={applyDefaultWarehouse}>
              Isi gudang default
            </Button>
          ) : null}
          <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Subtotal: </span>
            <span className="font-medium">{formatRupiah(subtotal)}</span>
          </div>
        </div>
      </div>
      {items.length === 0 ? (
        <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          Belum ada item. Pilih produk dari katalog di sebelah kiri.
        </p>
      ) : (
        <div className="max-h-[440px] space-y-2 overflow-auto pr-1">
          {showWarehouse ? (
            <div className="hidden gap-2 px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(140px,0.45fr)_72px_minmax(100px,0.35fr)_auto] sm:items-center">
              <span>Produk</span>
              <span>Gudang</span>
              <span>Qty</span>
              <span>Harga</span>
              <span />
            </div>
          ) : null}
          {items.map((item, index) => (
            <div key={`${item.catalogItemId}-${item.lineId || index}`} className="rounded-md border p-3">
              {showWarehouse ? (
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(140px,0.45fr)_72px_minmax(100px,0.35fr)_auto] sm:items-center">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.externalCode || "Tanpa SKU"}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs sm:sr-only">Gudang</Label>
                    <WarehouseSelect
                      value={item.warehouseId}
                      onChange={(warehouseId) => updateOrderItem(index, { warehouseId })}
                      className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    />
                    {!item.warehouseId && defaultWarehouseId ? (
                      <p className="text-xs text-muted-foreground sm:hidden">
                        Pakai default: {warehouseLabel("", warehouseNames, defaultWarehouseId)}
                      </p>
                    ) : null}
                  </div>
                  <Input
                    value={item.qty}
                    onChange={(e) => updateOrderItem(index, { qty: e.target.value })}
                    type="number"
                    min="1"
                    placeholder="Qty"
                  />
                  <Input
                    value={item.unitPrice}
                    onChange={(e) => updateOrderItem(index, { unitPrice: e.target.value })}
                    type="number"
                    min="0"
                    placeholder="Harga"
                  />
                  <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => removeOrderItem(index)}>
                    Hapus
                  </Button>
                </div>
              ) : (
                <>
                  <div className="mb-2 min-w-0">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.externalCode || "Tanpa SKU"}</p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-[88px_1fr_auto] sm:items-center">
                    <Input
                      value={item.qty}
                      onChange={(e) => updateOrderItem(index, { qty: e.target.value })}
                      type="number"
                      min="1"
                      placeholder="Qty"
                    />
                    <Input
                      value={item.unitPrice}
                      onChange={(e) => updateOrderItem(index, { unitPrice: e.target.value })}
                      type="number"
                      min="0"
                      placeholder="Harga"
                    />
                    <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => removeOrderItem(index)}>
                      Hapus
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function OrderSummary({
  contactLabel,
  items,
  warehouseNames,
  fulfillmentWarehouseId,
  hasWarehouses,
  subtotal,
  shippingCost,
  total,
  onStepChange,
}: {
  contactLabel: string;
  items: OrderItemForm[];
  warehouseNames: Map<string, string>;
  fulfillmentWarehouseId: string;
  hasWarehouses: boolean;
  subtotal: number;
  shippingCost: number;
  total: number;
  onStepChange: (step: OrderFormStep) => void;
}) {
  return (
    <aside className="h-fit rounded-lg border bg-background p-4 lg:sticky lg:top-0">
      <div className="mb-3">
        <h3 className="font-medium">Ringkasan pesanan</h3>
        <p className="text-sm text-muted-foreground">Tetap terlihat saat mengisi form.</p>
      </div>
      <div className="space-y-3 text-sm">
        <button type="button" className="w-full rounded-md bg-muted/40 p-3 text-left" onClick={() => onStepChange("contact")}>
          <span className="block text-xs text-muted-foreground">Contact</span>
          <span className="font-medium">{contactLabel}</span>
        </button>
        <button type="button" className="w-full rounded-md bg-muted/40 p-3 text-left" onClick={() => onStepChange("items")}>
          <span className="block text-xs text-muted-foreground">Produk & gudang</span>
          <span className="font-medium">{items.length} item dipilih</span>
          {items.length > 0 ? (
            <ul className="mt-2 max-h-28 space-y-1 overflow-auto text-xs text-muted-foreground">
              {items.map((item, index) => (
                <li key={`${item.catalogItemId}-${item.lineId || index}`} className="flex justify-between gap-2">
                  <span className="truncate">{item.name} ×{item.qty}</span>
                  {hasWarehouses ? (
                    <span className="shrink-0">{warehouseLabel(item.warehouseId, warehouseNames, fulfillmentWarehouseId)}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </button>
        <div className="rounded-md bg-muted/40 p-3">
          <div className="flex justify-between">
            <span>Total harga item</span>
            <span>{formatRupiah(subtotal)}</span>
          </div>
          <div className="mt-2 flex justify-between">
            <span>Total ongkir</span>
            <span>{formatRupiah(shippingCost)}</span>
          </div>
          <div className="mt-3 flex justify-between border-t pt-3 text-base font-bold">
            <span>Total pesanan</span>
            <span>{formatRupiah(total)}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

// orderHasInsufficientStock returns true when any stock-tracked item on the order
// exceeds available stock at the chosen warehouse (or tenant default).
function orderHasInsufficientStock(order: Order, stockRows: StockRow[], defaultWarehouseId: string): boolean {
  for (const it of order.items) {
    const id = it.catalogItemId;
    if (!id) continue;
    const warehouseId = it.warehouseId || defaultWarehouseId;
    const row = stockRows.find((r) => r.catalogItemId === id && (!warehouseId || r.warehouseId === warehouseId));
    if (!row) continue;
    if (row.available < (it.qty ?? 0)) return true;
  }
  return false;
}

function toOrderItemPayload(item: OrderItemForm, fallbackWarehouseId = ""): Order["items"][number] {
  return {
    lineId: item.lineId || undefined,
    catalogItemId: item.catalogItemId,
    externalCode: item.externalCode,
    name: item.name,
    qty: Number(item.qty || 1),
    unitPrice: Number(item.unitPrice || 0),
    sellUnit: item.sellUnit || undefined,
    warehouseId: item.warehouseId || fallbackWarehouseId || undefined,
  };
}

function formatBuyerLabel(order: Order): string {
  const name = normalizeBuyerField(order.contactDisplayName);
  const phone = normalizeBuyerField(order.contactPhone);
  if (name) return name;
  if (phone) return phone;
  return "Tanpa contact";
}

function normalizeBuyerField(value?: string): string {
  const trimmed = value?.trim() ?? "";
  // Legacy PII column placeholder after encryption migration (U+2022 BULLET).
  if (trimmed === "\u2022" || trimmed === "•") return "";
  return trimmed;
}

function normalizeEditableStatus(status: string) {
  if (status === "confirmed" || status === "paid") return "processing";
  if (status === "shipped") return "shipped";
  if (ORDER_STATUSES.some((option) => option.value === status)) return status;
  return "processing";
}

function statusLabel(status: string) {
  if (status === "confirmed" || status === "paid") return "Sedang diproses";
  return ORDER_STATUSES.find((option) => option.value === status)?.label ?? status;
}

function statusBadgeVariant(status: string) {
  if (status === "completed") return "success";
  if (status === "cancelled") return "destructive";
  if (status === "shipped") return "warning";
  return "secondary";
}

function optionalString(value: string) {
  const trimmed = value.trim();
  return trimmed || undefined;
}

function optionalNumber(value: string) {
  if (value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function calculateItemsSubtotal(items: OrderItemForm[]) {
  return items.reduce((sum, item) => {
    const qty = optionalNumber(item.qty) ?? 0;
    const unitPrice = optionalNumber(item.unitPrice) ?? 0;
    return sum + qty * unitPrice;
  }, 0);
}

function catalogDisplayPrice(item: CatalogItem) {
  if (item.effectiveSellPrice != null) return item.effectiveSellPrice;
  if (item.sellPrice != null) return item.sellPrice;
  return 0;
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}
