import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PortfolioDashboardChrome } from "@/components/personal/portfolio/portfolio-dashboard-chrome";
import {
  demoPaymentProof,
  formatPortfolioRupiah,
} from "@/lib/portfolio/demo-data";

export function PortfolioPaymentMockup() {
  return (
    <PortfolioDashboardChrome activeNav="orders">
      <div className="p-4">
        <div className="mb-4">
          <p className="font-semibold text-neutral-900">Payment verification</p>
          <p className="text-xs text-neutral-500">
            Order {demoPaymentProof.orderNumber}
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border border-amber-200/80 bg-amber-50/50">
          <div className="border-b border-amber-200/60 px-4 py-3">
            <Badge variant="warning">Perlu dicek</Badge>
            <p className="mt-2 text-sm text-amber-900">
              Bukti transfer sudah masuk — verifikasi atau tolak.
            </p>
          </div>

          <div className="grid gap-4 p-4 md:grid-cols-[200px_1fr]">
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-gradient-to-br from-neutral-100 to-neutral-200 p-4">
              <div className="h-28 w-full rounded-lg bg-white/80 shadow-inner" />
              <p className="mt-2 text-center text-[11px] text-neutral-500">
                Transfer screenshot placeholder
              </p>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border border-neutral-200/80 bg-white p-3">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                    Amount
                  </p>
                  <p className="mt-1 font-semibold text-neutral-900">
                    {formatPortfolioRupiah(demoPaymentProof.amount)}
                  </p>
                </div>
                <div className="rounded-lg border border-neutral-200/80 bg-white p-3">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                    Bank
                  </p>
                  <p className="mt-1 font-semibold text-neutral-900">
                    {demoPaymentProof.bankName}
                  </p>
                </div>
                <div className="rounded-lg border border-neutral-200/80 bg-white p-3">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                    Account name
                  </p>
                  <p className="mt-1 font-semibold text-neutral-900">
                    {demoPaymentProof.accountName}
                  </p>
                </div>
                <div className="rounded-lg border border-neutral-200/80 bg-white p-3">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                    OCR confidence
                  </p>
                  <p className="mt-1 font-semibold text-emerald-700">
                    {(demoPaymentProof.confidence * 100).toFixed(0)}%
                  </p>
                </div>
              </div>
              <p className="text-xs text-neutral-500">
                Transfer date: {demoPaymentProof.transferDate}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" className="rounded-full">
                  Verify payment
                </Button>
                <Button size="sm" variant="outline" className="rounded-full">
                  Reject
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PortfolioDashboardChrome>
  );
}
