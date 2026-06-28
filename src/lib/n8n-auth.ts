import { timingSafeEqual } from "crypto";

/**
 * Validates the shared secret sent by n8n in the `x-n8n-secret` header.
 * Returns null on success or a Response with the appropriate status on failure.
 */
export function verifyN8nRequest(request: Request): Response | null {
  const provided = request.headers.get("x-n8n-secret") ?? "";
  const expected = process.env.N8N_WEBHOOK_SECRET ?? "";

  if (!expected) {
    return new Response(
      JSON.stringify({ error: "Server misconfigured: N8N_WEBHOOK_SECRET not set" }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  return null;
}

export const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
