import { createServerFn } from "@tanstack/react-start";
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

/**
 * Fire-and-forget POST to the configured n8n webhook.
 * Runs server-side so the webhook URL + shared secret are never exposed
 * to the browser. Failures are swallowed so a workflow outage never
 * breaks the user-facing mutation.
 */
export const dispatchN8nEvent = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => EventSchema.parse(data))
  .handler(async ({ data }) => {
    const url = process.env.N8N_WEBHOOK_URL;
    const secret = process.env.N8N_WEBHOOK_SECRET;
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
