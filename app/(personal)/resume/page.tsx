import type { Metadata } from "next";

import { ResumeClassic } from "@/components/personal/resume-classic";
import { ResumeExportBar } from "@/components/personal/resume-export-bar";

import "@/styles/resume-print.css";

export const metadata: Metadata = {
  title: "Viko Wijaya — Resume",
  description:
    "Resume of Viko Wijaya — platform engineer and full-stack developer specializing in PostgreSQL performance, multi-tenant SaaS, and production commerce platforms.",
  robots: { index: true, follow: true },
  openGraph: {
    title: "Viko Wijaya — Resume",
    description:
      "Platform engineer and full-stack developer — PostgreSQL, Go, TypeScript, and multi-tenant SaaS.",
    type: "profile",
  },
};

export default function ResumePage() {
  return (
    <>
      <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6">
        <ResumeExportBar />
      </div>
      <ResumeClassic />
    </>
  );
}
