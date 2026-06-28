import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { verifyN8nRequest, jsonResponse } from "@/lib/n8n-auth";

const CollectedJobSchema = z.object({
  job_title: z.string().min(1).max(500),
  company_name: z.string().min(1).max(300),
  location: z.string().max(300).optional().nullable(),
  skills: z.array(z.string().max(80)).max(60).optional(),
  job_url: z.string().url().max(2000).optional().nullable(),
  source: z.string().max(120).optional().nullable(),
  description: z.string().max(30000).optional().nullable(),
  posted_date: z.string().datetime().optional().nullable(),
  status: z.enum(["new", "processed", "shared"]).optional(),
  raw_payload: z.record(z.string(), z.any()).optional().nullable(),
}).strict();

const PayloadSchema = z.union([
  CollectedJobSchema,
  z.array(CollectedJobSchema).max(500),
]);

async function readJsonBody(request: Request): Promise<unknown> {
  const ct = request.headers.get("content-type") ?? "";
  if (!ct.toLowerCase().includes("application/json")) {
    throw new Response(JSON.stringify({ error: "Content-Type must be application/json" }), { status: 415 });
  }
  const text = await request.text();
  if (text.length > 1024 * 1024) {
    throw new Response(JSON.stringify({ error: "Payload too large" }), { status: 413 });
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }
}

export const Route = createFileRoute("/api/public/n8n/collected-jobs")({
  server: {
    handlers: {
      // GET: list collected jobs (optionally filter by status)
      GET: async ({ request }) => {
        const auth = verifyN8nRequest(request);
        if (auth) return auth;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const url = new URL(request.url);
        const status = url.searchParams.get("status");
        const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "100", 10) || 100, 500);
        let q = supabaseAdmin.from("collected_jobs").select("*").order("created_at", { ascending: false }).limit(limit);
        if (status) q = q.eq("status", status);
        const { data, error } = await q;
        if (error) return jsonResponse({ error: error.message }, 500);
        return jsonResponse({ jobs: data ?? [] });
      },

      // POST: ingest one or many jobs (deduped on job_url)
      POST: async ({ request }) => {
        const auth = verifyN8nRequest(request);
        if (auth) return auth;
        let body: unknown;
        try {
          body = await readJsonBody(request);
        } catch (r) {
          return r instanceof Response ? r : jsonResponse({ error: "Bad request" }, 400);
        }
        const parsed = PayloadSchema.safeParse(body);
        if (!parsed.success) {
          return jsonResponse({ error: "Validation failed", issues: parsed.error.issues }, 422);
        }
        const rows = (Array.isArray(parsed.data) ? parsed.data : [parsed.data]).map((r) => ({
          ...r,
          skills: r.skills ?? [],
          status: r.status ?? "new",
        }));

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Split rows with a URL (upsert) vs without (plain insert)
        const withUrl = rows.filter((r) => r.job_url);
        const withoutUrl = rows.filter((r) => !r.job_url);

        const results: { inserted: number; updated: number; skipped: number } = {
          inserted: 0,
          updated: 0,
          skipped: 0,
        };

        if (withUrl.length) {
          const { data, error } = await supabaseAdmin
            .from("collected_jobs")
            .upsert(withUrl, { onConflict: "job_url", ignoreDuplicates: false })
            .select("id");
          if (error) return jsonResponse({ error: error.message }, 500);
          results.inserted += data?.length ?? 0;
        }
        if (withoutUrl.length) {
          const { data, error } = await supabaseAdmin
            .from("collected_jobs")
            .insert(withoutUrl)
            .select("id");
          if (error) return jsonResponse({ error: error.message }, 500);
          results.inserted += data?.length ?? 0;
        }

        return jsonResponse({ ok: true, ...results, total: rows.length }, 201);
      },

      // PATCH: update job status (e.g. mark processed/shared from a workflow)
      PATCH: async ({ request }) => {
        const auth = verifyN8nRequest(request);
        if (auth) return auth;
        let body: unknown;
        try {
          body = await readJsonBody(request);
        } catch (r) {
          return r instanceof Response ? r : jsonResponse({ error: "Bad request" }, 400);
        }
        const schema = z.object({
          id: z.string().uuid(),
          status: z.enum(["new", "processed", "shared"]),
        });
        const parsed = schema.safeParse(body);
        if (!parsed.success) {
          return jsonResponse({ error: "Validation failed", issues: parsed.error.issues }, 422);
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin
          .from("collected_jobs")
          .update({ status: parsed.data.status })
          .eq("id", parsed.data.id);
        if (error) return jsonResponse({ error: error.message }, 500);
        return jsonResponse({ ok: true });
      },
    },
  },
});
