import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const eventTypeSchema = z.enum(["auth", "role_action", "data", "system"]);

const recordSchema = z.object({
  event_type: eventTypeSchema,
  action: z.string().min(1).max(100),
  status: z.enum(["success", "failure"]).default("success"),
  target_user_id: z.string().uuid().nullish(),
  resource_type: z.string().max(64).nullish(),
  resource_id: z.string().max(128).nullish(),
  metadata: z.record(z.any()).default({}),
});

export const recordAuditEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.infer<typeof recordSchema>) => recordSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;

    // Look up actor role for context (best-effort)
    let actorRole: string | null = null;
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();
    actorRole = (roles?.role as string | undefined) ?? null;

    const email = (claims as { email?: string } | null)?.email ?? null;

    const { error } = await supabase.from("audit_logs").insert({
      event_type: data.event_type,
      action: data.action,
      actor_id: userId,
      actor_email: email,
      actor_role: actorRole,
      target_user_id: data.target_user_id ?? null,
      resource_type: data.resource_type ?? null,
      resource_id: data.resource_id ?? null,
      status: data.status,
      metadata: data.metadata,
    });

    if (error) throw new Error(error.message);
    return { ok: true };
  });

const listSchema = z.object({
  event_type: eventTypeSchema.nullish(),
  action: z.string().nullish(),
  status: z.enum(["success", "failure"]).nullish(),
  search: z.string().nullish(),
  actor: z.string().nullish(),
  consultancy_id: z.string().uuid().nullish(),
  from: z.string().nullish(),
  to: z.string().nullish(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(200).default(50),
});

export const listAuditLogs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.infer<typeof listSchema>) => listSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Enforce super_admin only (RLS also enforces this, but fail early with a clear error)
    const { data: isSuper } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "super_admin",
    });
    if (!isSuper) throw new Error("Forbidden: super_admin role required");

    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;

    let q = supabase
      .from("audit_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (data.event_type) q = q.eq("event_type", data.event_type);
    if (data.action) q = q.eq("action", data.action);
    if (data.status) q = q.eq("status", data.status);
    if (data.from) q = q.gte("created_at", data.from);
    if (data.to) q = q.lte("created_at", data.to);

    if (data.actor) {
      const a = data.actor.trim();
      // UUID → actor_id equality; otherwise email ilike
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(a);
      if (isUuid) {
        q = q.or(`actor_id.eq.${a},target_user_id.eq.${a}`);
      } else {
        q = q.ilike("actor_email", `%${a}%`);
      }
    }

    if (data.consultancy_id) {
      const { data: members } = await supabase
        .from("profiles")
        .select("id")
        .eq("consultancy_id", data.consultancy_id);
      const ids = (members ?? []).map((m) => m.id);
      if (ids.length === 0) {
        return { rows: [], total: 0, page: data.page, pageSize: data.pageSize };
      }
      q = q.in("actor_id", ids);
    }

    if (data.search) {
      const s = `%${data.search}%`;
      q = q.or(
        `actor_email.ilike.${s},action.ilike.${s},resource_id.ilike.${s},resource_type.ilike.${s},metadata.cs.${JSON.stringify({})}`
          .replace(/,metadata\.cs\.\{\}$/, "") +
          `,metadata::text.ilike.${s}`,
      );
    }

    const { data: rows, error, count } = await q;
    if (error) throw new Error(error.message);

    // Fetch distinct actions for the filter dropdown (best-effort)
    return { rows: rows ?? [], total: count ?? 0, page: data.page, pageSize: data.pageSize };
  });

export const listAuditFacets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: isSuper } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "super_admin",
    });
    if (!isSuper) throw new Error("Forbidden: super_admin role required");

    const [actionsRes, consultanciesRes] = await Promise.all([
      supabase.from("audit_logs").select("action").order("action").limit(1000),
      supabase.from("consultancies").select("id, name").order("name"),
    ]);
    const actions = Array.from(
      new Set((actionsRes.data ?? []).map((r) => r.action).filter(Boolean)),
    );
    return {
      actions,
      consultancies: consultanciesRes.data ?? [],
    };
  });
