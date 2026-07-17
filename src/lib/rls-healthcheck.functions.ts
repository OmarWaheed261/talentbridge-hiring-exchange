import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type CheckResult = {
  name: string;
  category: "connection" | "auth" | "role" | "rls";
  ok: boolean;
  detail?: string;
  error?: {
    code?: string;
    message: string;
    hint?: string;
    details?: string;
    policyHint?: string;
  };
};

type PgError = { code?: string; message: string; hint?: string; details?: string };

function policyHint(table: string, op: "SELECT" | "INSERT" | "UPDATE" | "DELETE", err: PgError): string {
  if (err.code === "42501") {
    if (/permission denied for function/i.test(err.message)) {
      return `RLS helper function is missing EXECUTE grant. Run: GRANT EXECUTE ON FUNCTION <fn> TO authenticated;`;
    }
    if (/permission denied for (table|relation)/i.test(err.message)) {
      return `Missing table GRANT. Run: GRANT ${op} ON public.${table} TO authenticated;`;
    }
  }
  if (err.code === "42P17") return `Recursive RLS policy on public.${table}. Wrap subquery in a SECURITY DEFINER function.`;
  if (/row-level security/i.test(err.message)) {
    return `No matching RLS policy on public.${table} for ${op}. Add a CREATE POLICY that permits this role/action.`;
  }
  return `Review policies on public.${table} for role authenticated (${op}).`;
}

export const runRlsHealthcheck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId, claims } = context;
    const results: CheckResult[] = [];

    // 1) Connection
    try {
      const { error } = await supabase.rpc("has_role", { _user_id: userId, _role: "consultancy_admin" });
      results.push({
        name: "Database connection",
        category: "connection",
        ok: !error || error.code !== "PGRST301",
        detail: error ? `Reached DB (rpc responded)` : "Reached DB",
        ...(error && error.code === "PGRST301" ? { error: { message: error.message } } : {}),
      });
    } catch (e: any) {
      results.push({ name: "Database connection", category: "connection", ok: false, error: { message: String(e?.message ?? e) } });
    }

    // 2) Auth session
    results.push({
      name: "Authenticated session",
      category: "auth",
      ok: Boolean(userId),
      detail: userId ? `User ${userId} (${claims?.email ?? "no email"})` : "No session",
    });

    // 3) has_role() executable
    try {
      const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "consultancy_admin" });
      results.push({
        name: "has_role() executable",
        category: "role",
        ok: !error,
        detail: error ? undefined : `Returned ${String(data)}`,
        ...(error ? { error: { code: error.code, message: error.message, hint: error.hint ?? undefined, policyHint: "GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;" } } : {}),
      });
    } catch (e: any) {
      results.push({ name: "has_role() executable", category: "role", ok: false, error: { message: String(e?.message ?? e) } });
    }

    // 4) current_consultancy_id() executable
    let consultancyId: string | null = null;
    try {
      const { data, error } = await supabase.rpc("current_consultancy_id");
      consultancyId = (data as string | null) ?? null;
      results.push({
        name: "current_consultancy_id() executable",
        category: "role",
        ok: !error,
        detail: error ? undefined : `Returned ${consultancyId ?? "null"}`,
        ...(error ? { error: { code: error.code, message: error.message, hint: error.hint ?? undefined, policyHint: "GRANT EXECUTE ON FUNCTION public.current_consultancy_id() TO authenticated;" } } : {}),
      });
    } catch (e: any) {
      results.push({ name: "current_consultancy_id() executable", category: "role", ok: false, error: { message: String(e?.message ?? e) } });
    }

    // 5) user_roles readable
    {
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
      results.push({
        name: "SELECT public.user_roles (self)",
        category: "rls",
        ok: !error,
        detail: error ? undefined : `Roles: ${(data ?? []).map((r) => r.role).join(", ") || "none"}`,
        ...(error ? { error: { code: error.code, message: error.message, hint: error.hint ?? undefined, details: error.details ?? undefined, policyHint: policyHint("user_roles", "SELECT", error) } } : {}),
      });
    }

    // 6) profile readable
    {
      const { error } = await supabase.from("profiles").select("id, consultancy_id").eq("id", userId).maybeSingle();
      results.push({
        name: "SELECT public.profiles (self)",
        category: "rls",
        ok: !error,
        ...(error ? { error: { code: error.code, message: error.message, hint: error.hint ?? undefined, policyHint: policyHint("profiles", "SELECT", error) } } : {}),
      });
    }

    // 7) Tenant tables reachable
    for (const table of ["jobs", "candidates", "collected_jobs", "consultancies", "notifications"] as const) {
      const { error, count } = await supabase.from(table).select("id", { count: "exact", head: true });
      results.push({
        name: `SELECT public.${table} (tenant scoped)`,
        category: "rls",
        ok: !error,
        detail: error ? undefined : `${count ?? 0} rows visible`,
        ...(error ? { error: { code: error.code, message: error.message, hint: error.hint ?? undefined, details: error.details ?? undefined, policyHint: policyHint(table, "SELECT", error) } } : {}),
      });
    }

    return {
      ranAt: new Date().toISOString(),
      userId,
      consultancyId,
      results,
      summary: {
        total: results.length,
        passed: results.filter((r) => r.ok).length,
        failed: results.filter((r) => !r.ok).length,
      },
    };
  });
