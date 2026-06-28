import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { dispatchN8nEvent } from "@/lib/n8n-dispatch.functions";

const QueueSchema = z.object({
  page_key: z.enum(["job-collection"]),
  format: z.enum(["csv", "xlsx"]),
  filters: z.record(z.string(), z.unknown()).default({}),
});

export const queueExport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => QueueSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("consultancy_id")
      .eq("id", userId)
      .maybeSingle();
    if (profileError) throw new Error(profileError.message);
    if (!profile?.consultancy_id) {
      throw new Error("You must belong to a consultancy to queue exports.");
    }

    const { data: job, error } = await supabase
      .from("export_jobs")
      .insert({
        user_id: userId,
        consultancy_id: profile.consultancy_id,
        page_key: data.page_key,
        format: data.format,
        filters: data.filters,
        status: "queued",
      })
      .select("id, status, format, page_key, created_at")
      .single();
    if (error) throw new Error(error.message);

    // Fire-and-forget; failures shouldn't block the user.
    try {
      await dispatchN8nEvent({
        data: {
          event: "export.requested",
          consultancy_id: profile.consultancy_id,
          payload: {
            job_id: job.id,
            page_key: data.page_key,
            format: data.format,
            filters: data.filters,
            consultancy_id: profile.consultancy_id,
            requested_by: userId,
          },
        },
      });
    } catch {
      // n8n misconfig should not roll back the queued row; runner can still claim it.
    }

    return job;
  });

const SignSchema = z.object({ jobId: z.string().uuid() });

export const getSignedExportUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => SignSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    // RLS scopes this to the caller's consultancy.
    const { data: job, error } = await supabase
      .from("export_jobs")
      .select("id, status, file_path, format")
      .eq("id", data.jobId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!job) throw new Error("Export not found.");
    if (job.status !== "ready" || !job.file_path) {
      throw new Error("Export is not ready yet.");
    }

    const { data: signed, error: signError } = await supabase.storage
      .from("exports")
      .createSignedUrl(job.file_path, 60 * 15);
    if (signError) throw new Error(signError.message);

    return { url: signed.signedUrl, format: job.format, file_path: job.file_path };
  });
