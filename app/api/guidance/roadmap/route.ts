import { NextResponse } from "next/server";

import { roadmapGuidance } from "@/lib/guidance/roadmap-fnb";

export const runtime = "nodejs";

// Guidance pribadi — konten statis dari lib/guidance/roadmap-fnb.ts.
export async function GET() {
  return NextResponse.json(roadmapGuidance, {
    headers: { "Cache-Control": "no-store" },
  });
}
