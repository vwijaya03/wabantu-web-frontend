"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { env } from "@/lib/env";
import type { StoreProduct } from "@/lib/api/storefront";

export default function ProductDetailPage() {
  const { tenantSlug, productSlug } = useParams<{ tenantSlug: string; productSlug: string }>();
  const product = useQuery({
    queryKey: ["product", tenantSlug, productSlug],
    queryFn: () =>
      axios
        .get<StoreProduct>(`${env.apiUrl}/api/v1/public/store/${tenantSlug}/products/${productSlug}`)
        .then((r) => r.data),
  });

  if (product.isLoading) return <div className="p-8">Memuat produk…</div>;
  if (!product.data) return <div className="p-8">Produk tidak ditemukan.</div>;

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-semibold">{product.data.name}</h1>
      <p className="mt-4 text-lg">Rp {product.data.price.toLocaleString("id-ID")}</p>
    </main>
  );
}
