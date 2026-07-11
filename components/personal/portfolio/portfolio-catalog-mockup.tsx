import { Badge } from "@/components/ui/badge";
import { PortfolioDashboardChrome } from "@/components/personal/portfolio/portfolio-dashboard-chrome";
import {
  demoCatalogItems,
  formatPortfolioRupiah,
} from "@/lib/portfolio/demo-data";

export function PortfolioCatalogMockup({ deck = false }: { deck?: boolean }) {
  const featured = demoCatalogItems[0];
  const items = deck ? demoCatalogItems.slice(0, 2) : demoCatalogItems;

  return (
    <PortfolioDashboardChrome activeNav="catalog" deck={deck}>
      <div
        className={`grid gap-0 ${
          deck ? "grid-cols-[minmax(0,220px)_1fr]" : "lg:grid-cols-[minmax(0,300px)_1fr]"
        }`}
      >
        <div
          className={`border-b border-neutral-200/80 bg-white p-4 ${
            deck ? "border-b-0 border-r p-3" : "lg:border-b-0 lg:border-r"
          }`}
        >
          <p className="mb-3 font-semibold text-neutral-900">Tambah produk</p>
          <div className="space-y-3">
            <div>
              <p className="mb-1 text-[11px] font-medium text-neutral-500">SKU</p>
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-neutral-700">
                {featured.sku}
              </div>
            </div>
            <div>
              <p className="mb-1 text-[11px] font-medium text-neutral-500">Nama</p>
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-neutral-700">
                {featured.name}
              </div>
            </div>
            <div>
              <p className="mb-1 text-[11px] font-medium text-neutral-500">Harga</p>
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-neutral-700">
                {formatPortfolioRupiah(featured.price)}
              </div>
            </div>
            <div>
              <p className="mb-1 text-[11px] font-medium text-neutral-500">Deskripsi</p>
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs leading-relaxed text-neutral-600">
                {featured.description}
              </div>
            </div>
          </div>
        </div>

        <div className={deck ? "p-3" : "p-4"}>
          <p className={`font-semibold text-neutral-900 ${deck ? "mb-2" : "mb-3"}`}>
            Daftar produk ({items.length})
          </p>
          <div className="overflow-hidden rounded-xl border border-neutral-200/80 bg-white">
            <div
              className={`grid grid-cols-[1.4fr_0.8fr_0.8fr] gap-2 border-b border-neutral-200/80 bg-neutral-50/80 px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-neutral-500 ${
                deck ? "" : "hidden md:grid"
              }`}
            >
              <span>Produk</span>
              <span>SKU</span>
              <span className="text-right">Harga</span>
            </div>
            <div className="divide-y divide-neutral-200/60">
              {items.map((item) => (
                <div key={item.sku}>
                  <div
                    className={`grid grid-cols-[1.4fr_0.8fr_0.8fr] gap-2 px-4 py-3 ${
                      deck ? "" : "hidden md:grid"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-neutral-900">{item.name}</p>
                        <Badge
                          variant={item.isActive ? "success" : "secondary"}
                          className="text-[10px]"
                        >
                          {item.isActive ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </div>
                      {item.description ? (
                        <p className="mt-1 line-clamp-2 text-xs text-neutral-500">
                          {item.description}
                        </p>
                      ) : null}
                    </div>
                    <p className="font-mono text-xs text-neutral-600">{item.sku}</p>
                    <p className="text-right font-medium text-neutral-900">
                      {formatPortfolioRupiah(item.price)}
                      <span className="block text-xs font-normal text-neutral-500">
                        / {item.unit}
                      </span>
                    </p>
                  </div>

                  {deck ? null : (
                  <div className="space-y-2 px-4 py-3 md:hidden">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-neutral-900">{item.name}</p>
                        <p className="font-mono text-xs text-neutral-600">{item.sku}</p>
                      </div>
                      <Badge
                        variant={item.isActive ? "success" : "secondary"}
                        className="shrink-0 text-[10px]"
                      >
                        {item.isActive ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </div>
                    {item.description ? (
                      <p className="line-clamp-2 text-xs text-neutral-500">{item.description}</p>
                    ) : null}
                    <p className="font-medium text-neutral-900">
                      {formatPortfolioRupiah(item.price)}
                      <span className="text-xs font-normal text-neutral-500"> / {item.unit}</span>
                    </p>
                  </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PortfolioDashboardChrome>
  );
}
