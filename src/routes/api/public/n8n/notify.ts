import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { verifyN8nRequest, jsonResponse } from "@/lib/n8n-auth";

const NotifySchema = z.object({
  user_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  message: z.string().max(2000).optional(),
  type: z.enum(["job", "candidate", "interview", "hire", "info"]).default("info"),
  link: z.string().max(2000).optional().nullable(),
});

export const Route = createFileRoute("/api/public/n8n/notify")({
  server: {
    handlers: {
      // POST: push a notification to a user (e.g. workflow completed, interview booked)
      POST: async ({ request }) => {
        const auth = verifyN8nRequest(request);
        if (auth) return auth;
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return jsonResponse({ error: "Invalid JSON" }, 400);
        }
        const parsed = z.union([NotifySchema, z.array(NotifySchema).max(100)]).safeParse(body);
        if (!parsed.success) {
          return jsonResponse({ error: "Validation failed", issues: parsed.error.issues }, 422);
        }
        const rows = Array.isArray(parsed.data) ? parsed.data : [parsed.data];
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("notifications")
          .insert(rows)
          .select("id");
        if (error) return jsonResponse({ error: error.message }, 500);
        return jsonResponse({ inserted: data?.length ?? 0 }, 201);
      },
    },
  },
});
