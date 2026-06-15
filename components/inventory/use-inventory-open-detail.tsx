"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";

/** Buka dialog detail dari query ?open=<id> (deep link dari kartu stok / referensi). */
export function useInventoryOpenDetail(
  setDetailId: (id: string | null) => void,
) {
  const searchParams = useSearchParams();
  const openId = searchParams.get("open");

  useEffect(() => {
    if (openId) setDetailId(openId);
  }, [openId, setDetailId]);
}

export function InventoryOpenDetailEffect({
  setDetailId,
}: {
  setDetailId: (id: string | null) => void;
}) {
  useInventoryOpenDetail(setDetailId);
  return null;
}

export function InventoryOpenDetailSuspense({
  setDetailId,
}: {
  setDetailId: (id: string | null) => void;
}) {
  return (
    <Suspense fallback={null}>
      <InventoryOpenDetailEffect setDetailId={setDetailId} />
    </Suspense>
  );
}
