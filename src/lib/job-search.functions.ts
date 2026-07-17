import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SearchInput = z.object({
  q: z.string().optional().default(""),
  location: z.string().optional().default(""),
  employment_type: z.string().optional().default(""),
  experience_level: z.string().optional().default(""),
  source: z.string().optional().default(""),
  skills: z.array(z.string()).optional().default([]),
  tags: z.array(z.string()).optional().default([]),
  sort: z.enum(["newest", "oldest", "company", "relevance"]).optional().default("newest"),
  page: z.number().int().min(1).optional().default(1),
  pageSize: z.number().int().min(1).max(100).optional().default(24),
});

const sel = (s: string): string => s;

export const searchCollectedJobs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => SearchInput.parse(data ?? {}))
  .handler(async ({ data, context }) => {
    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;

    let q = context.supabase
      .from("collected_jobs")
      .select(sel("*"), { count: "exact" });

    if (data.q.trim()) {
      const term = data.q.trim().replace(/[%_]/g, " ");
      q = q.or(
        `job_title.ilike.%${term}%,company_name.ilike.%${term}%,description.ilike.%${term}%`,
      );
    }
    if (data.location.trim()) q = q.ilike("location", `%${data.location.trim()}%`);
    if (data.employment_type) q = q.eq("employment_type", data.employment_type);
    if (data.experience_level) q = q.eq("experience_level", data.experience_level);
    if (data.source) q = q.eq("source", data.source);
    if (data.skills.length) q = q.overlaps("skills", data.skills);
    if (data.tags.length) q = q.overlaps("tags", data.tags);

    if (data.sort === "newest" || data.sort === "relevance") {
      q = q.order("created_at", { ascending: false });
    } else if (data.sort === "oldest") {
      q = q.order("created_at", { ascending: true });
    } else if (data.sort === "company") {
      q = q.order("company_name", { ascending: true });
    }

    const { data: rows, count, error } = await q.range(from, to);
    if (error) throw new Error(error.message);
    return { jobs: (rows ?? []) as any[], total: count ?? 0 };
  });

export const getCollectedJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("collected_jobs")
      .select(sel("*"))
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row as any;
  });

export const toggleBookmark = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ collected_job_id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: existing } = await context.supabase
      .from("job_bookmarks")
      .select("id")
      .eq("collected_job_id", data.collected_job_id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (existing) {
      const { error } = await context.supabase
        .from("job_bookmarks")
        .delete()
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
      return { bookmarked: false };
    }
    const { error } = await context.supabase
      .from("job_bookmarks")
      .insert({ user_id: context.userId, collected_job_id: data.collected_job_id });
    if (error) throw new Error(error.message);
    return { bookmarked: true };
  });

export const listBookmarks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("job_bookmarks")
      .select(sel("collected_job_id"))
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: any) => r.collected_job_id as string);
  });

export const saveSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({
      name: z.string().min(1).max(120),
      query: z.record(z.string(), z.any()),
      is_shared: z.boolean().optional().default(false),
    }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("consultancy_id")
      .eq("id", context.userId)
      .maybeSingle();
    const { data: row, error } = await context.supabase
      .from("saved_searches")
      .insert({
        user_id: context.userId,
        consultancy_id: profile?.consultancy_id ?? null,
        name: data.name,
        query: data.query,
        is_shared: data.is_shared,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listSavedSearches = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("saved_searches")
      .select(sel("*"))
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as any[];
  });

export const deleteSavedSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("saved_searches")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getAutomationOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [totalRes, todayRes, lastLogRes, logsRes] = await Promise.all([
      context.supabase.from("collected_jobs").select("id", { count: "exact", head: true }),
      context.supabase
        .from("collected_jobs")
        .select("id", { count: "exact", head: true })
        .gte("created_at", dayAgo),
      context.supabase
        .from("automation_logs")
        .select(sel("created_at,source,status"))
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      context.supabase
        .from("automation_logs")
        .select(sel("*"))
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    const dupes = ((logsRes.data ?? []) as any[])
      .filter((r) => new Date(r.created_at).getTime() > Date.now() - 86400_000)
      .reduce((s, r) => s + (r.duplicates_removed ?? 0), 0);

    return {
      totalJobs: totalRes.count ?? 0,
      jobsToday: todayRes.count ?? 0,
      duplicatesRemoved24h: dupes,
      lastSync: (lastLogRes.data as any)?.created_at ?? null,
      lastSyncSource: (lastLogRes.data as any)?.source ?? null,
      lastSyncStatus: (lastLogRes.data as any)?.status ?? null,
      logs: (logsRes.data ?? []) as any[],
    };
  });
