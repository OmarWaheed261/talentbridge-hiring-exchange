import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { verifyN8nRequest, jsonResponse } from "@/lib/n8n-auth";

const LogSchema = z.object({
  source: z.string().min(1).max(80),
  event: z.string().min(1).max(120),
  status: z.enum(["success", "failure", "warning", "info"]).optional().default("success"),
  message: z.string().max(2000).optional().nullable(),
  jobs_imported: z.number().int().min(0).optional().default(0),
  duplicates_removed: z.number().int().min(0).optional().default(0),
  metadata: z.record(z.string(), z.any()).optional().default({}),
});

export const Route = createFileRoute("/api/public/n8n/automation-logs")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = verifyN8nRequest(request);
        if (auth) return auth;
        const ct = request.headers.get("content-type") ?? "";
        if (!ct.toLowerCase().includes("application/json")) {
          return jsonResponse({ error: "Content-Type must be application/json" }, 415);
        }
        const text = await request.text();
        if (text.length > 64 * 1024) return jsonResponse({ error: "Payload too large" }, 413);
        let body: unknown;
        try {
          body = JSON.parse(text);
        } catch {
          return jsonResponse({ error: "Invalid JSON" }, 400);
        }
        const parsed = LogSchema.safeParse(body);
        if (!parsed.success) {
          return jsonResponse({ error: "Validation failed", issues: parsed.error.issues }, 422);
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("automation_logs")
          .insert(parsed.data)
          .select("id")
          .single();
        if (error) return jsonResponse({ error: error.message }, 500);
        return jsonResponse({ ok: true, id: data.id }, 201);
      },
    },
  },
});
