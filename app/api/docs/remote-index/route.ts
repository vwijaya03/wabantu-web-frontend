import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const rawUrl = req.nextUrl.searchParams.get("url")?.trim();
  if (!rawUrl) {
    return NextResponse.json({ message: "url is required" }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(rawUrl);
  } catch {
    return NextResponse.json({ message: "invalid url" }, { status: 400 });
  }

  if (target.protocol !== "https:" && target.protocol !== "http:") {
    return NextResponse.json({ message: "only http/https docs index URLs are allowed" }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch(target.toString(), {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json({ message: `remote docs index returned HTTP ${res.status}` }, { status: 502 });
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json") && !target.pathname.endsWith(".json")) {
      return NextResponse.json({ message: "remote docs index must be JSON" }, { status: 502 });
    }

    const payload = await res.json();
    if (!payload || !Array.isArray(payload.docs)) {
      return NextResponse.json({ message: "remote docs index has invalid shape" }, { status: 502 });
    }

    return NextResponse.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : "failed to fetch remote docs index";
    return NextResponse.json({ message }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
