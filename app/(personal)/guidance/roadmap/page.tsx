import type { Metadata } from "next";

import { RoadmapGuidanceReader } from "@/components/personal/guidance/roadmap-reader";

export const metadata: Metadata = {
  title: "Roadmap 100 Juta · Guidance",
  description:
    "Panduan pribadi F&B Korean Chicken Grill Surabaya — fase, resep, checklist bahan, dan aturan uang.",
  robots: { index: false, follow: false },
};

export default function RoadmapGuidancePage() {
  return <RoadmapGuidanceReader />;
}
