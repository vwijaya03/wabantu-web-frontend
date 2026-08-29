import Link from "next/link";

export default function SimulationLandingPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Simulasi Tes Coding Frontend</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Latihan proctored dengan topik pilihan kamu: 5 MCQ, 1 React build, 1 debug. Setelah
          submit, setiap soal menampilkan penjelasan dan best practice.
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
          href="/learn/simulation/custom"
          className="rounded-lg border border-slate-300 px-6 py-3 font-medium text-slate-700 hover:bg-slate-100"
        >
          Template interviewer
        </Link>
      </div>
    </div>
  );
}
