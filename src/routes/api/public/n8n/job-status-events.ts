import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { verifyN8nRequest, jsonResponse } from "@/lib/n8n-auth";

const AckSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(500),
});

export const Route = createFileRoute("/api/public/n8n/job-status-events")({
  server: {
    handlers: {
      // GET: list unprocessed job status change events with a full job snapshot.
      //   Query params:
      //     ?limit=100  (max 500)
      //     ?include_processed=true to inspect history (default false)
      GET: async ({ request }) => {
        const auth = verifyN8nRequest(request);
        if (auth) return auth;

        const url = new URL(request.url);
        const limit = Math.min(
          Math.max(Number(url.searchParams.get("limit") ?? "100") || 100, 1),
          500,
        );
        const includeProcessed =
          url.searchParams.get("include_processed") === "true";

        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );

        let query = supabaseAdmin
          .from("job_status_events")
          .select(
            `id, job_id, consultancy_id, old_status, new_status, changed_by, created_at, processed_at,
             job:jobs ( id, title, status, location, employment_type, consultancy_id, updated_at )`,
          )
          .order("created_at", { ascending: true })
          .limit(limit);

        if (!includeProcessed) {
          query = query.is("processed_at", null);
        }

        const { data, error } = await query;
        if (error) return jsonResponse({ error: error.message }, 500);

        return jsonResponse({ count: data?.length ?? 0, events: data ?? [] });
      },

      // POST: acknowledge processed events — body: { ids: [uuid, ...] }
      POST: async ({ request }) => {
        const auth = verifyN8nRequest(request);
        if (auth) return auth;

        const ct = request.headers.get("content-type") ?? "";
        if (!ct.toLowerCase().includes("application/json")) {
          return jsonResponse(
            { error: "Content-Type must be application/json" },
            415,
          );
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return jsonResponse({ error: "Invalid JSON" }, 400);
        }

        const parsed = AckSchema.safeParse(body);
        if (!parsed.success) {
          return jsonResponse(
            { error: "Validation failed", issues: parsed.error.issues },
            422,
          );
        }

        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );

        const { data, error } = await supabaseAdmin
          .from("job_status_events")
          .update({ processed_at: new Date().toISOString() })
          .in("id", parsed.data.ids)
          .is("processed_at", null)
          .select("id");

        if (error) return jsonResponse({ error: error.message }, 500);
        return jsonResponse({ acknowledged: data?.length ?? 0 });
      },
    },
  },
});
