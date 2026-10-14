import { Badge } from "@/components/ui/badge";
import { formatPaymentProofFlag } from "@/lib/payment-proof";

/** Badge hasil cek bukti transfer (advisory; keputusan tetap di owner). */
export function ProofCheckBadge({ value }: { value?: string | null }) {
  if (value === "cocok") return <Badge className="bg-emerald-600 hover:bg-emerald-600">Bukti cocok</Badge>;
  if (value === "perlu_dicek") return <Badge className="bg-amber-500 hover:bg-amber-500">Perlu dicek</Badge>;
  return null;
}

const EXTRA_REASON_LABELS: Record<string, string> = {
  proof_blocked: "Upload bukti diblokir setelah beberapa penolakan",
};

export function ProofCheckReasons({ value, reasons }: { value?: string | null; reasons?: string[] | null }) {
  if (value !== "perlu_dicek" || !reasons?.length) return null;
  return (
    <ul className="list-disc space-y-0.5 pl-5 text-xs text-amber-700 dark:text-amber-300">
      {reasons.map((r) => (
        <li key={r}>{EXTRA_REASON_LABELS[r] ?? formatPaymentProofFlag(r)}</li>
      ))}
    </ul>
  );
}
