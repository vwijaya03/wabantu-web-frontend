"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { storefrontApi } from "@/lib/api/storefront";

export default function StorefrontPage() {
  const params = useParams<{ tenantSlug: string }>();
  const slug = params.tenantSlug;

  const store = useQuery({
    queryKey: ["store", slug],
    queryFn: () => storefrontApi.publicStore(slug),
  });
  const products = useQuery({
    queryKey: ["store-products", slug],
    queryFn: () => storefrontApi.publicProducts(slug),
    enabled: store.data?.enabled === true,
  });

  if (store.isLoading) {
    return <div className="p-8 text-sm text-muted-foreground">Memuat toko…</div>;
  }
  if (!store.data?.enabled) {
    return <div className="p-8 text-sm">Toko belum diaktifkan.</div>;
  }

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-semibold">{store.data.storeTitle ?? slug}</h1>
      {store.data.description ? <p className="mt-2 text-muted-foreground">{store.data.description}</p> : null}
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {(products.data?.items ?? []).map((p) => (
          <Link
            key={p.id}
            href={`/toko/${slug}/products/${p.slug}`}
            className="rounded-lg border p-4 hover:bg-muted/40"
          >
            <div className="font-medium">{p.name}</div>
            <div className="text-sm text-muted-foreground">Rp {p.price.toLocaleString("id-ID")}</div>
          </Link>
        ))}
      </div>
    </main>
  );
}
