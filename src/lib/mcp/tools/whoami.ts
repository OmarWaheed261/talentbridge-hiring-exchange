import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase-for-user";

export default defineTool({
  name: "whoami",
  title: "Who am I",
  description:
    "Return the signed-in TalentBridge user's profile (name, email, consultancy, roles). Useful to confirm the MCP connection is authenticated.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };

    const supabase = supabaseForUser(ctx);
    const userId = ctx.getUserId();

    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId!).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId!),
    ]);

    const result = {
      user_id: userId,
      email: ctx.getUserEmail(),
      profile: profile ?? null,
      roles: (roles ?? []).map((r) => r.role),
    };

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: result,
    };
  },
});
