import type { ReactNode } from "react";

import { PersonalNav } from "@/components/personal/personal-nav";

export default function PersonalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <PersonalNav />
      {children}
    </div>
  );
}
