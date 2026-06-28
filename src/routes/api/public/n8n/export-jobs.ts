import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { verifyN8nRequest, jsonResponse } from "@/lib/n8n-auth";

const ClaimSchema = z.object({
  action: z.literal("claim"),
  job_id: z.string().uuid(),
}).strict();

const CompleteSchema = z.object({
  action: z.literal("complete"),
  job_id: z.string().uuid(),
  file_path: z.string().min(1).max(1024),
  row_count: z.number().int().min(0).max(10_000_000),
}).strict();

const FailSchema = z.object({
  action: z.literal("fail"),
  job_id: z.string().uuid(),
  error: z.string().min(1).max(2000),
}).strict();

const PayloadSchema = z.discriminatedUnion("action", [ClaimSchema, CompleteSchema, FailSchema]);

async function readJsonBody(request: Request): Promise<unknown> {
  const ct = request.headers.get("content-type") ?? "";
  if (!ct.toLowerCase().includes("application/json")) {
    throw new Response(JSON.stringify({ error: "Content-Type must be application/json" }), { status: 415 });
  }
  const text = await request.text();
  if (text.length > 64 * 1024) {
    throw new Response(JSON.stringify({ error: "Payload too large" }), { status: 413 });
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }
}

export const Route = createFileRoute("/api/public/n8n/export-jobs")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = verifyN8nRequest(request);
        if (auth) return auth;

        let raw: unknown;
        try {
          raw = await readJsonBody(request);
        } catch (e) {
          if (e instanceof Response) return e;
          throw e;
        }
        const parsed = PayloadSchema.safeParse(raw);
        if (!parsed.success) {
          return jsonResponse({ error: "Invalid payload", details: parsed.error.flatten() }, 400);
        }
        const body = parsed.data;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        if (body.action === "claim") {
          const { data, error } = await supabaseAdmin
            .from("export_jobs")
            .update({ status: "running" })
            .eq("id", body.job_id)
            .eq("status", "queued")
            .select("id, page_key, format, filters, consultancy_id, user_id")
            .maybeSingle();
          if (error) return jsonResponse({ error: error.message }, 500);
          if (!data) return jsonResponse({ error: "Job not claimable" }, 409);
          return jsonResponse({ job: data });
        }

        if (body.action === "complete") {
          const { data, error } = await supabaseAdmin
            .from("export_jobs")
            .update({
              status: "ready",
              file_path: body.file_path,
              row_count: body.row_count,
              completed_at: new Date().toISOString(),
              error: null,
            })
            .eq("id", body.job_id)
            .select("id, status, row_count")
            .maybeSingle();
          if (error) return jsonResponse({ error: error.message }, 500);
          if (!data) return jsonResponse({ error: "Job not found" }, 404);
          return jsonResponse({ job: data });
        }

        // fail
        const { data, error } = await supabaseAdmin
          .from("export_jobs")
          .update({
            status: "failed",
            error: body.error,
            completed_at: new Date().toISOString(),
          })
          .eq("id", body.job_id)
          .select("id, status")
          .maybeSingle();
        if (error) return jsonResponse({ error: error.message }, 500);
        if (!data) return jsonResponse({ error: "Job not found" }, 404);
        return jsonResponse({ job: data });
      },
    },
  },
});
