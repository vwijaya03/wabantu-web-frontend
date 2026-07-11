import type { ReactNode } from "react";

import { PersonalNav } from "@/components/personal/personal-nav";

export default function ResumeLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PersonalNav />
      {children}
    </>
  );
}
