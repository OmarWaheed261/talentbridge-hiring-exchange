import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      GET: async () => {
        const started = Date.now();
        try {
          const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
          const url = process.env.SUPABASE_URL!;
          const res = await fetch(`${url}/rest/v1/`, {
            headers: { apikey: key },
          });
          return Response.json({
            ok: res.ok,
            status: res.status,
            latency_ms: Date.now() - started,
            checked_at: new Date().toISOString(),
          }, { status: res.ok ? 200 : 503 });
        } catch (e: any) {
          return Response.json({
            ok: false,
            error: String(e?.message ?? e),
            latency_ms: Date.now() - started,
            checked_at: new Date().toISOString(),
          }, { status: 503 });
        }
      },
    },
  },
});
