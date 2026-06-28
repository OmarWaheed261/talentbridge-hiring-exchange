import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const UrlSchema = z
  .string()
  .trim()
  .url()
  .refine((u) => /^https?:\/\//i.test(u), "Must be http(s) URL")
  .max(2048);
const SecretSchema = z.string().min(8).max(512);

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "consultancy_admin",
  });
  if (error) throw new Error(error.message);
  if (data) return;
  const { data: isSuper } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "super_admin",
  });
  if (!isSuper) throw new Error("Forbidden: admin role required");
}

function mask(secret: string | null | undefined) {
  if (!secret) return null;
  if (secret.length <= 8) return "••••••••";
  return `${secret.slice(0, 4)}••••${secret.slice(-4)}`;
}

export const getN8nSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("consultancy_id")
      .eq("id", context.userId)
      .maybeSingle();
    const consultancyId = profile?.consultancy_id;
    if (!consultancyId) {
      return { configured: false as const, url: "", secretMasked: null, hasSecret: false };
    }
    const { data } = await context.supabase
      .from("integration_settings")
      .select("n8n_webhook_url, n8n_webhook_secret, updated_at")
      .eq("consultancy_id", consultancyId)
      .maybeSingle();
    return {
      configured: !!data?.n8n_webhook_url,
      url: data?.n8n_webhook_url ?? "",
      secretMasked: mask(data?.n8n_webhook_secret),
      hasSecret: !!data?.n8n_webhook_secret,
      updatedAt: data?.updated_at ?? null,
    };
  });

async function pingN8n(url: string, secret: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-n8n-secret": secret,
      },
      body: JSON.stringify({
        event: "connection.test",
        payload: { message: "TalentBridge connection test" },
        sent_at: new Date().toISOString(),
        source: "talentbridge",
      }),
      signal: controller.signal,
    });
    return { ok: res.ok, status: res.status, statusText: res.statusText };
  } catch (e) {
    return { ok: false, status: 0, statusText: (e as Error).message };
  } finally {
    clearTimeout(timeout);
  }
}

export const testN8nConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ url: UrlSchema, secret: SecretSchema }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    return pingN8n(data.url, data.secret);
  });

export const saveN8nSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        url: UrlSchema,
        secret: SecretSchema,
        skipTest: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("consultancy_id")
      .eq("id", context.userId)
      .maybeSingle();
    const consultancyId = profile?.consultancy_id;
    if (!consultancyId) throw new Error("No consultancy assigned to your account");

    if (!data.skipTest) {
      const test = await pingN8n(data.url, data.secret);
      if (!test.ok) {
        throw new Error(
          `Connection test failed (${test.status || "network"}): ${test.statusText}. Settings were not saved.`,
        );
      }
    }

    const { error } = await context.supabase
      .from("integration_settings")
      .upsert(
        {
          consultancy_id: consultancyId,
          n8n_webhook_url: data.url,
          n8n_webhook_secret: data.secret,
          updated_by: context.userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "consultancy_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
