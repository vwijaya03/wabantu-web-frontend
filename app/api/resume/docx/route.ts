import { NextResponse } from "next/server";

import { buildResumeDocx } from "@/lib/resume/ats-docx";

export async function GET() {
  const buffer = await buildResumeDocx();

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": 'attachment; filename="Viko-Wijaya-Resume.docx"',
    },
  });
}
