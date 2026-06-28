import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { verifyN8nRequest, jsonResponse } from "@/lib/n8n-auth";

const StatusEnum = z.enum([
  "submitted",
  "screening",
  "interview",
  "offer",
  "hired",
  "rejected",
]);

const CandidateSchema = z
  .object({
    candidate_name: z.string().trim().min(1).max(200),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email()
      .max(200)
      .optional()
      .nullable(),
    phone: z
      .string()
      .trim()
      .min(3)
      .max(50)
      .regex(/^[+0-9()\-\s.]+$/, "Invalid phone characters")
      .optional()
      .nullable(),
    experience: z.string().trim().max(200).optional().nullable(),
    skills: z.array(z.string().trim().min(1).max(80)).max(100).optional(),
    resume_url: z
      .string()
      .trim()
      .url()
      .max(2000)
      .refine((u) => /^https?:\/\//i.test(u), "resume_url must be http(s)")
      .optional()
      .nullable(),
    notes: z.string().trim().max(20000).optional().nullable(),
    linked_job_id: z.string().uuid().optional().nullable(),
    consultancy_id: z.string().uuid().optional().nullable(),
    status: StatusEnum.optional(),
  })
  .strict();

const UpdateSchema = z
  .object({
    id: z.string().uuid(),
    status: StatusEnum.optional(),
    notes: z.string().trim().max(20000).optional(),
  })
  .strict()
  .refine(
    (v) => v.status !== undefined || v.notes !== undefined,
    { message: "At least one of `status` or `notes` is required" },
  );

const CandidatePayloadSchema = z.union([
  CandidateSchema,
  z.array(CandidateSchema).min(1).max(100),
]);

const MAX_BODY_BYTES = 256 * 1024; // 256 KB hard cap

async function readJsonBody(request: Request): Promise<
  { ok: true; value: unknown } | { ok: false; response: Response }
> {
  const ct = request.headers.get("content-type") ?? "";
  if (!ct.toLowerCase().includes("application/json")) {
    return {
      ok: false,
      response: jsonResponse(
        { error: "Content-Type must be application/json" },
        415,
      ),
    };
  }
  const len = Number(request.headers.get("content-length") ?? "0");
  if (len && len > MAX_BODY_BYTES) {
    return { ok: false, response: jsonResponse({ error: "Payload too large" }, 413) };
  }
  let text: string;
  try {
    text = await request.text();
  } catch {
    return { ok: false, response: jsonResponse({ error: "Unable to read body" }, 400) };
  }
  if (text.length > MAX_BODY_BYTES) {
    return { ok: false, response: jsonResponse({ error: "Payload too large" }, 413) };
  }
  if (!text.trim()) {
    return { ok: false, response: jsonResponse({ error: "Empty body" }, 400) };
  }
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, response: jsonResponse({ error: "Invalid JSON" }, 400) };
  }
}


export const Route = createFileRoute("/api/public/n8n/candidates")({
  server: {
    handlers: {
      // POST: ingest candidate(s) from n8n (e.g. parsed resumes, ATS sync)
      POST: async ({ request }) => {
        const auth = verifyN8nRequest(request);
        if (auth) return auth;
        const body = await readJsonBody(request);
        if (!body.ok) return body.response;
        const payload = CandidatePayloadSchema.safeParse(body.value);
        if (!payload.success) {
          return jsonResponse(
            { error: "Validation failed", issues: payload.error.issues },
            422,
          );
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
        const body = await readJsonBody(request);
        if (!body.ok) return body.response;
        const parsed = UpdateSchema.safeParse(body.value);
        if (!parsed.success) {
          return jsonResponse(
            { error: "Validation failed", issues: parsed.error.issues },
            422,
          );
        }
        const { id, ...updates } = parsed.data;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("candidates")
          .update(updates)
          .eq("id", id)
          .select("id, status, notes")
          .maybeSingle();
        if (error) return jsonResponse({ error: error.message }, 500);
        if (!data) return jsonResponse({ error: "Candidate not found" }, 404);
        return jsonResponse({ candidate: data });
      },
    },
  },
});
