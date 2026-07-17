import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * RLS behavior tests for `jobs` and `candidates` against each role:
 *   - super_admin           → sees & manages everything
 *   - consultancy_admin     → scoped to own consultancy
 *   - consultancy_recruiter → scoped to own consultancy
 *
 * Requires env: SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY
 * Run: bunx vitest run tests/rls.test.ts
 */

const SUPABASE_URL = process.env.SUPABASE_URL!;
const ANON_KEY = process.env.SUPABASE_PUBLISHABLE_KEY!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
  throw new Error("Missing SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY / SUPABASE_SERVICE_ROLE_KEY");
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const TAG = `rls-${Date.now()}`;
const PASSWORD = "TestPass!234";

type Ctx = {
  consultancyA: string;
  consultancyB: string;
  jobA: string;
  jobB: string;
  candA: string;
  candB: string;
  users: Record<"super" | "adminA" | "recruiterA" | "adminB", { id: string; email: string; client: SupabaseClient }>;
};

const ctx = {} as Ctx;

async function createUserAs(
  role: "super_admin" | "consultancy_admin" | "consultancy_recruiter",
  consultancyId: string | null,
  label: string,
) {
  const email = `${TAG}-${label}@example.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;
  const id = data.user!.id;
  // handle_new_user() already inserted profile + default 'consultancy_recruiter' role.
  await admin.from("profiles").update({ consultancy_id: consultancyId, full_name: label }).eq("id", id);
  await admin.from("user_roles").delete().eq("user_id", id);
  await admin.from("user_roles").insert({ user_id: id, role });

  const client = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
  });
  const { error: signInErr } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (signInErr) throw signInErr;
  return { id, email, client };
}

beforeAll(async () => {
  // Seed two consultancies
  const { data: cA, error: eA } = await admin
    .from("consultancies")
    .insert({ company_name: `${TAG}-A` })
    .select("id")
    .single();
  if (eA) throw eA;
  const { data: cB, error: eB } = await admin
    .from("consultancies")
    .insert({ company_name: `${TAG}-B` })
    .select("id")
    .single();
  if (eB) throw eB;
  ctx.consultancyA = cA.id;
  ctx.consultancyB = cB.id;

  // Seed a job per consultancy (jobs table has no consultancy_id — global-visible)
  const { data: jA } = await admin.from("jobs").insert({ job_title: `${TAG}-job-A`, company_name: "A" }).select("id").single();
  const { data: jB } = await admin.from("jobs").insert({ job_title: `${TAG}-job-B`, company_name: "B" }).select("id").single();
  ctx.jobA = jA!.id;
  ctx.jobB = jB!.id;

  // Seed candidates scoped by consultancy_id
  const { data: candA } = await admin
    .from("candidates")
    .insert({ candidate_name: `${TAG}-cand-A`, consultancy_id: ctx.consultancyA })
    .select("id")
    .single();
  const { data: candB } = await admin
    .from("candidates")
    .insert({ candidate_name: `${TAG}-cand-B`, consultancy_id: ctx.consultancyB })
    .select("id")
    .single();
  ctx.candA = candA!.id;
  ctx.candB = candB!.id;

  // Users
  ctx.users = {
    super: await createUserAs("super_admin", null, "super"),
    adminA: await createUserAs("consultancy_admin", ctx.consultancyA, "adminA"),
    recruiterA: await createUserAs("consultancy_recruiter", ctx.consultancyA, "recruiterA"),
    adminB: await createUserAs("consultancy_admin", ctx.consultancyB, "adminB"),
  };
}, 60_000);

afterAll(async () => {
  await admin.from("candidates").delete().in("id", [ctx.candA, ctx.candB]);
  await admin.from("jobs").delete().in("id", [ctx.jobA, ctx.jobB]);
  await admin.from("consultancies").delete().in("id", [ctx.consultancyA, ctx.consultancyB]);
  for (const u of Object.values(ctx.users ?? {})) {
    await admin.auth.admin.deleteUser(u.id).catch(() => {});
  }
});

describe("jobs RLS — all authenticated users can read; only super_admin can write", () => {
  it.each(["super", "adminA", "recruiterA", "adminB"] as const)("%s can SELECT all jobs", async (who) => {
    const { data, error } = await ctx.users[who].client.from("jobs").select("id").in("id", [ctx.jobA, ctx.jobB]);
    expect(error).toBeNull();
    expect(data?.map((r) => r.id).sort()).toEqual([ctx.jobA, ctx.jobB].sort());
  });

  it("super_admin can INSERT a job", async () => {
    const { data, error } = await ctx.users.super.client
      .from("jobs")
      .insert({ job_title: `${TAG}-super-insert`, company_name: "X" })
      .select("id")
      .single();
    expect(error).toBeNull();
    if (data) await admin.from("jobs").delete().eq("id", data.id);
  });

  it.each(["adminA", "recruiterA"] as const)("%s CANNOT INSERT a job", async (who) => {
    const { error } = await ctx.users[who].client
      .from("jobs")
      .insert({ job_title: `${TAG}-forbidden`, company_name: "X" })
      .select("id")
      .single();
    expect(error).not.toBeNull();
    expect(error?.code).toBe("42501");
  });

  it("consultancy_admin CANNOT UPDATE a job", async () => {
    const { data, error } = await ctx.users.adminA.client
      .from("jobs")
      .update({ status: "closed" })
      .eq("id", ctx.jobA)
      .select("id");
    // Update either errors or affects 0 rows depending on policy stack; assert no change succeeded.
    expect(error !== null || (data?.length ?? 0) === 0).toBe(true);
  });

  it("super_admin can UPDATE a job", async () => {
    const { data, error } = await ctx.users.super.client
      .from("jobs")
      .update({ status: "on_hold" })
      .eq("id", ctx.jobA)
      .select("id, status");
    expect(error).toBeNull();
    expect(data?.[0]?.status).toBe("on_hold");
  });
});

describe("candidates RLS — consultancy-scoped; super_admin sees all", () => {
  it("super_admin sees candidates in every consultancy", async () => {
    const { data, error } = await ctx.users.super.client
      .from("candidates")
      .select("id, consultancy_id")
      .in("id", [ctx.candA, ctx.candB]);
    expect(error).toBeNull();
    expect(data?.length).toBe(2);
  });

  it.each(["adminA", "recruiterA"] as const)("%s sees only own-consultancy candidates", async (who) => {
    const { data, error } = await ctx.users[who].client
      .from("candidates")
      .select("id, consultancy_id")
      .in("id", [ctx.candA, ctx.candB]);
    expect(error).toBeNull();
    expect(data?.map((r) => r.id)).toEqual([ctx.candA]);
  });

  it("adminB does NOT see consultancy A's candidate", async () => {
    const { data, error } = await ctx.users.adminB.client
      .from("candidates")
      .select("id")
      .eq("id", ctx.candA);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it.each(["adminA", "recruiterA"] as const)("%s can INSERT candidate into own consultancy", async (who) => {
    const { data, error } = await ctx.users[who].client
      .from("candidates")
      .insert({ candidate_name: `${TAG}-${who}-ins`, consultancy_id: ctx.consultancyA })
      .select("id")
      .single();
    expect(error).toBeNull();
    if (data) await admin.from("candidates").delete().eq("id", data.id);
  });

  it("adminA CANNOT INSERT candidate into another consultancy", async () => {
    const { error } = await ctx.users.adminA.client
      .from("candidates")
      .insert({ candidate_name: `${TAG}-cross`, consultancy_id: ctx.consultancyB })
      .select("id")
      .single();
    expect(error).not.toBeNull();
  });

  it("adminA can UPDATE own-consultancy candidate", async () => {
    const { data, error } = await ctx.users.adminA.client
      .from("candidates")
      .update({ notes: "updated" })
      .eq("id", ctx.candA)
      .select("id, notes");
    expect(error).toBeNull();
    expect(data?.[0]?.notes).toBe("updated");
  });

  it("adminB CANNOT UPDATE consultancy A's candidate", async () => {
    const { data, error } = await ctx.users.adminB.client
      .from("candidates")
      .update({ notes: "hijack" })
      .eq("id", ctx.candA)
      .select("id");
    expect(error !== null || (data?.length ?? 0) === 0).toBe(true);
  });

  it("recruiterA CANNOT DELETE another consultancy's candidate", async () => {
    const { data, error } = await ctx.users.recruiterA.client
      .from("candidates")
      .delete()
      .eq("id", ctx.candB)
      .select("id");
    expect(error !== null || (data?.length ?? 0) === 0).toBe(true);
    // Confirm still present via admin
    const { data: still } = await admin.from("candidates").select("id").eq("id", ctx.candB);
    expect(still?.length).toBe(1);
  });
});
