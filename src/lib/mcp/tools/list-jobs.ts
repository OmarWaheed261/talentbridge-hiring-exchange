import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase-for-user";

export default defineTool({
  name: "list_jobs",
  title: "List jobs",
  description:
    "List jobs visible to the signed-in TalentBridge user. Results are scoped by row-level security to the caller's consultancy and role.",
  inputSchema: {
    status: z
      .enum(["open", "closed", "on_hold", "filled"])
      .optional()
      .describe("Optional job status filter."),
    search: z
      .string()
      .optional()
      .describe("Case-insensitive substring matched against job title or company."),
    limit: z.number().int().min(1).max(100).default(25).describe("Max rows to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, search, limit }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };

    let query = supabaseForUser(ctx)
      .from("jobs")
      .select(
        "id, job_title, company_name, location, status, employment_type, experience_level, required_skills, posted_date",
      )
      .order("posted_date", { ascending: false })
      .limit(limit);

    if (status) query = query.eq("status", status);
    if (search) query = query.or(`job_title.ilike.%${search}%,company_name.ilike.%${search}%`);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { jobs: data ?? [] },
    };
  },
});
