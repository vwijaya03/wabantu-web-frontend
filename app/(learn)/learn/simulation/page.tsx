import Link from "next/link";

export default function SimulationLandingPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Simulasi Tes Coding Frontend</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Format Tendem Frontend Developer: 5 MCQ, 1 React form build, 1 React debug — 7 soal,
          98 menit. Build & debug diacak dari bank (tidak harus WaitlistForm/Hero persis).
        </p>
      </div>
      <div className="flex flex-wrap gap-4">
        <Link
          href="/learn/simulation/setup"
          className="rounded-lg bg-emerald-600 px-6 py-3 font-medium text-white hover:bg-emerald-700"
        >
          Mulai simulasi
        </Link>
        <Link
          href="/learn/simulation/history"
          className="rounded-lg border border-slate-300 px-6 py-3 font-medium text-slate-700 hover:bg-slate-100"
        >
          Riwayat simulasi
        </Link>
        <Link
          href="/learn/simulation/custom"
          className="rounded-lg border border-slate-300 px-6 py-3 font-medium text-slate-700 hover:bg-slate-100"
        >
          Template interviewer
        </Link>
      </div>
    </div>
  );
}
