import { env } from "@/lib/env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Same-origin SSE proxy → api-go. Used when the UI is on ngrok/public host
 * (browser cannot call localhost:4000). Streams the body without buffering.
 */
export async function GET(request: Request): Promise<Response> {
  const incoming = new URL(request.url);
  const upstream = new URL(`${env.apiUrlInternal}/inbox/stream`);
  upstream.search = incoming.search;

  const upstreamRes = await fetch(upstream, {
    headers: {
      Accept: "text/event-stream",
    },
    cache: "no-store",
  });

  if (!upstreamRes.ok || !upstreamRes.body) {
    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      statusText: upstreamRes.statusText,
    });
  }

  return new Response(upstreamRes.body, {
    status: upstreamRes.status,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
