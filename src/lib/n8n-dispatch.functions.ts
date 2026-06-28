import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const EventSchema = z.object({
  event: z.enum([
    "candidate.submitted",
    "candidate.status_changed",
    "job.created",
    "job.status_changed",
  ]),
  payload: z.record(z.string(), z.unknown()),
});

export type N8nEvent = z.infer<typeof EventSchema>;

async function loadConsultancySettings(
  consultancyId: string | null | undefined,
): Promise<{ url: string | null; secret: string | null }> {
  if (!consultancyId) return { url: null, secret: null };
  try {
    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) return { url: null, secret: null };
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data } = await admin
      .from("integration_settings")
      .select("n8n_webhook_url, n8n_webhook_secret")
      .eq("consultancy_id", consultancyId)
      .maybeSingle();
    return {
      url: (data?.n8n_webhook_url as string | null) ?? null,
      secret: (data?.n8n_webhook_secret as string | null) ?? null,
    };
  } catch {
    return { url: null, secret: null };
  }
}

/**
 * Fire-and-forget POST to the configured n8n webhook.
 * Prefers per-consultancy settings stored in integration_settings, then
 * falls back to N8N_WEBHOOK_URL / N8N_WEBHOOK_SECRET env vars.
 */
export const dispatchN8nEvent = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    EventSchema.extend({
      consultancy_id: z.string().uuid().optional(),
    }).parse(data),
  )
  .handler(async ({ data }) => {
    const fromDb = await loadConsultancySettings(data.consultancy_id);
    const url = fromDb.url ?? process.env.N8N_WEBHOOK_URL;
    const secret = fromDb.secret ?? process.env.N8N_WEBHOOK_SECRET;
    if (!url) return { ok: false, reason: "N8N_WEBHOOK_URL not configured" };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(secret ? { "x-n8n-secret": secret } : {}),
        },
        body: JSON.stringify({
          event: data.event,
          payload: data.payload,
          sent_at: new Date().toISOString(),
          source: "talentbridge",
        }),
      });
      return { ok: res.ok, status: res.status };
    } catch (e) {
      return { ok: false, reason: (e as Error).message };
    }
  });
