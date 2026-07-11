import type { ReactNode } from "react";

export default function PersonalLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-white text-neutral-900">{children}</div>;
}
