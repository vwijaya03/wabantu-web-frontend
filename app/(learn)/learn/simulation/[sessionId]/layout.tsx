import type { ReactNode } from "react";

/** Wider shell for live exam (editor + navigator need horizontal space). */
export default function ExamSessionLayout({ children }: { children: ReactNode }) {
  return (
    <div className="exam-shell-wide relative left-1/2 w-[min(100vw-2rem,90rem)] max-w-none -translate-x-1/2">
      {children}
    </div>
  );
}
