"use client";

export function ResumeExportBar() {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="resume-export-bar mb-6 flex flex-wrap items-center justify-end gap-2 print:hidden">
      <a
        href="/api/resume/docx"
        className="inline-flex items-center rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-800 shadow-sm transition-colors hover:bg-neutral-50"
        download
      >
        Download DOCX
      </a>
      <button
        type="button"
        onClick={handlePrint}
        className="inline-flex items-center rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-neutral-700"
      >
        Download PDF
      </button>
    </div>
  );
}
