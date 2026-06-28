import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { verifyN8nRequest, jsonResponse } from "@/lib/n8n-auth";

const CandidateSchema = z.object({
  candidate_name: z.string().min(1).max(200),
  email: z.string().email().max(200).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  experience: z.string().max(200).optional().nullable(),
  skills: z.array(z.string().max(80)).max(100).optional(),
  resume_url: z.string().url().max(2000).optional().nullable(),
  notes: z.string().max(20000).optional().nullable(),
  linked_job_id: z.string().uuid().optional().nullable(),
  consultancy_id: z.string().uuid().optional().nullable(),
  status: z
    .enum(["submitted", "screening", "interview", "offer", "hired", "rejected"])
    .optional(),
});

const UpdateSchema = z.object({
  id: z.string().uuid(),
  status: z
    .enum(["submitted", "screening", "interview", "offer", "hired", "rejected"])
    .optional(),
  notes: z.string().max(20000).optional(),
});

export const Route = createFileRoute("/api/public/n8n/candidates")({
  server: {
    handlers: {
      // POST: ingest candidate(s) from n8n (e.g. parsed resumes, ATS sync)
      POST: async ({ request }) => {
        const auth = verifyN8nRequest(request);
        if (auth) return auth;
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return jsonResponse({ error: "Invalid JSON" }, 400);
        }
        const payload = z.union([CandidateSchema, z.array(CandidateSchema).max(100)]).safeParse(body);
        if (!payload.success) {
          return jsonResponse({ error: "Validation failed", issues: payload.error.issues }, 422);
        }
        const rows = Array.isArray(payload.data) ? payload.data : [payload.data];
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("candidates")
          .insert(rows.map((r) => ({ ...r, skills: r.skills ?? [] })))
          .select("id, candidate_name, status");
        if (error) return jsonResponse({ error: error.message }, 500);
        return jsonResponse({ inserted: data?.length ?? 0, candidates: data }, 201);
      },
      // PATCH: update candidate status (e.g. interview scheduled by n8n workflow)
      PATCH: async ({ request }) => {
        const auth = verifyN8nRequest(request);
        if (auth) return auth;
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return jsonResponse({ error: "Invalid JSON" }, 400);
        }
        const parsed = UpdateSchema.safeParse(body);
        if (!parsed.success) {
          return jsonResponse({ error: "Validation failed", issues: parsed.error.issues }, 422);
        }
        const { id, ...updates } = parsed.data;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("candidates")
          .update(updates)
          .eq("id", id)
          .select("id, status, notes")
          .single();
        if (error) return jsonResponse({ error: error.message }, 404);
        return jsonResponse({ candidate: data });
      },
    },
  },
});
