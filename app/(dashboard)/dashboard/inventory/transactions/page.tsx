import { redirect } from "next/navigation";

/** @deprecated Gunakan halaman per jenis: /inventory/adjustments, /transfers, dll. */
export default function LegacyTransactionsPage() {
  redirect("/dashboard/inventory/adjustments");
}
