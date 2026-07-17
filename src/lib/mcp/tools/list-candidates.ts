import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase-for-user";

export default defineTool({
  name: "list_candidates",
  title: "List candidates",
  description:
    "List candidates the signed-in TalentBridge user can see. Filter by status, skill keyword, or linked job. Row-level security scopes results to the caller's consultancy.",
  inputSchema: {
    status: z
      .enum(["submitted", "screening", "interview", "offer", "hired", "rejected"])
      .optional()
      .describe("Optional candidate status filter."),
    skill: z
      .string()
      .optional()
      .describe("Return candidates whose skills array contains this keyword (case-sensitive match)."),
    linked_job_id: z.string().uuid().optional().describe("Filter to candidates linked to a specific job."),
    limit: z.number().int().min(1).max(100).default(25).describe("Max rows to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, skill, linked_job_id, limit }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };

    let query = supabaseForUser(ctx)
      .from("candidates")
      .select(
        "id, candidate_name, email, phone, status, skills, experience, linked_job_id, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) query = query.eq("status", status);
    if (linked_job_id) query = query.eq("linked_job_id", linked_job_id);
    if (skill) query = query.contains("skills", [skill]);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { candidates: data ?? [] },
    };
  },
});
