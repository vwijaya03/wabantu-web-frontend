import { Badge } from "@/components/ui/badge";
import { PortfolioDashboardChrome } from "@/components/personal/portfolio/portfolio-dashboard-chrome";
import {
  demoOrders,
  formatPortfolioRupiah,
} from "@/lib/portfolio/demo-data";

const orderStatusLabel: Record<string, string> = {
  draft: "Draft",
  processing: "Processing",
  shipped: "Shipped",
  completed: "Completed",
};

const paymentStatusLabel: Record<string, string> = {
  unpaid: "Belum ada bukti",
  proof_submitted: "Perlu dicek",
  verified: "Sudah dibayar",
  rejected: "Bukti ditolak",
};

const paymentVariant: Record<string, "warning" | "success" | "destructive" | "secondary"> = {
  unpaid: "secondary",
  proof_submitted: "warning",
  verified: "success",
  rejected: "destructive",
};

export function PortfolioOrdersMockup() {
  return (
    <PortfolioDashboardChrome activeNav="orders">
      <div className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-neutral-900">Daftar pesanan</p>
            <p className="text-xs text-neutral-500">{demoOrders.length} orders shown</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-neutral-200/80 bg-white">
          <div className="hidden grid-cols-[1.4fr_1fr_0.8fr_0.8fr] gap-2 border-b border-neutral-200/80 bg-neutral-50/80 px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-neutral-500 md:grid">
            <span>Pesanan</span>
            <span>Pembeli</span>
            <span>Status</span>
            <span className="text-right">Total</span>
          </div>
          <div className="divide-y divide-neutral-200/60">
            {demoOrders.map((order) => (
              <div key={order.id}>
                <div className="hidden grid-cols-[1.4fr_1fr_0.8fr_0.8fr] gap-2 px-4 py-3 md:grid">
                  <div>
                    <p className="font-medium text-neutral-900">
                      {order.orderNumber}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {order.items.map((i) => i.name).join(", ")}
                    </p>
                    {order.trackingNumber ? (
                      <p className="mt-1 text-xs text-neutral-500">
                        {order.courier} · {order.trackingNumber}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-neutral-500">{order.courier}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-neutral-900">{order.contactName}</p>
                    <p className="text-xs text-neutral-500">{order.contactPhone}</p>
                  </div>
                  <div className="space-y-1">
                    <Badge variant="outline" className="text-[10px]">
                      {orderStatusLabel[order.status]}
                    </Badge>
                    <Badge
                      variant={paymentVariant[order.paymentStatus]}
                      className="block w-fit text-[10px]"
                    >
                      {paymentStatusLabel[order.paymentStatus]}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-neutral-900">
                      {formatPortfolioRupiah(order.total)}
                    </p>
                    <p className="text-xs text-neutral-500">{order.createdAt}</p>
                  </div>
                </div>

                <div className="space-y-3 px-4 py-3 md:hidden">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-neutral-900">{order.orderNumber}</p>
                      <p className="text-xs text-neutral-500">
                        {order.items.map((i) => i.name).join(", ")}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-medium text-neutral-900">
                        {formatPortfolioRupiah(order.total)}
                      </p>
                      <p className="text-xs text-neutral-500">{order.createdAt}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-neutral-900">{order.contactName}</p>
                    <p className="text-xs text-neutral-500">{order.contactPhone}</p>
                  </div>
                  {order.trackingNumber ? (
                    <p className="text-xs text-neutral-500">
                      {order.courier} · {order.trackingNumber}
                    </p>
                  ) : (
                    <p className="text-xs text-neutral-500">{order.courier}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {orderStatusLabel[order.status]}
                    </Badge>
                    <Badge
                      variant={paymentVariant[order.paymentStatus]}
                      className="text-[10px]"
                    >
                      {paymentStatusLabel[order.paymentStatus]}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PortfolioDashboardChrome>
  );
}
