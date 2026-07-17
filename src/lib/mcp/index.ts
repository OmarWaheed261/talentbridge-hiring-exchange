import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listJobs from "./tools/list-jobs";
import listCandidates from "./tools/list-candidates";
import whoami from "./tools/whoami";

// The OAuth issuer MUST be the direct Supabase host. On publish, SUPABASE_URL
// is rewritten to the `.lovable.cloud` proxy which mcp-js rejects (RFC 8414
// issuer mismatch). VITE_SUPABASE_PROJECT_ID is inlined by Vite at build time
// and survives publish unchanged.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "talentbridge-mcp",
  title: "TalentBridge AI",
  version: "0.1.0",
  instructions:
    "Read-only access to a TalentBridge AI workspace. Use `whoami` to confirm the connection, `list_jobs` to browse open roles, and `list_candidates` to look up submitted candidates. All tools run as the signed-in user and respect the same row-level permissions as the web app.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [whoami, listJobs, listCandidates],
});
