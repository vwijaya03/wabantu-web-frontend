import { redirect } from "next/navigation";

/** @deprecated Operasi stok dipisah per halaman dokumen. */
export default function LegacyOperationsPage() {
  redirect("/dashboard/inventory/adjustments");
}
