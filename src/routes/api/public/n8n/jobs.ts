import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { verifyN8nRequest, jsonResponse } from "@/lib/n8n-auth";

const JobSchema = z.object({
  job_title: z.string().min(1).max(300),
  company_name: z.string().min(1).max(300),
  job_description: z.string().max(20000).optional().nullable(),
  job_url: z.string().url().max(2000).optional().nullable(),
  location: z.string().max(300).optional().nullable(),
  salary_range: z.string().max(120).optional().nullable(),
  source: z.string().max(120).optional().nullable(),
  required_skills: z.array(z.string().max(80)).max(50).optional(),
  employment_type: z
    .enum(["full_time", "part_time", "contract", "contract_to_hire", "internship"])
    .optional(),
  experience_level: z.enum(["entry", "mid", "senior", "lead", "principal"]).optional(),
  status: z.enum(["open", "on_hold", "closed", "filled"]).optional(),
});

const PayloadSchema = z.union([JobSchema, z.array(JobSchema).max(100)]);

export const Route = createFileRoute("/api/public/n8n/jobs")({
  server: {
    handlers: {
      // GET: list open jobs (for n8n to enrich/distribute)
      GET: async ({ request }) => {
        const auth = verifyN8nRequest(request);
        if (auth) return auth;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const url = new URL(request.url);
        const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10) || 50, 200);
        const { data, error } = await supabaseAdmin
          .from("jobs")
          .select("*")
          .eq("status", "open")
          .order("posted_date", { ascending: false })
          .limit(limit);
        if (error) return jsonResponse({ error: error.message }, 500);
        return jsonResponse({ jobs: data ?? [] });
      },
      // POST: ingest one or many jobs from n8n workflows (scrapers, integrations)
      POST: async ({ request }) => {
        const auth = verifyN8nRequest(request);
        if (auth) return auth;
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return jsonResponse({ error: "Invalid JSON" }, 400);
        }
        const parsed = PayloadSchema.safeParse(body);
        if (!parsed.success) {
          return jsonResponse({ error: "Validation failed", issues: parsed.error.issues }, 422);
        }
        const rows = Array.isArray(parsed.data) ? parsed.data : [parsed.data];
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("jobs")
          .insert(rows.map((r) => ({ ...r, required_skills: r.required_skills ?? [] })))
          .select("id, job_title, company_name");
        if (error) return jsonResponse({ error: error.message }, 500);
        return jsonResponse({ inserted: data?.length ?? 0, jobs: data }, 201);
      },
    },
  },
});
