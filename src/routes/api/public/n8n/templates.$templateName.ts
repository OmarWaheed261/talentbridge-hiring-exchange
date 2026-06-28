import { createFileRoute } from "@tanstack/react-router";
import { jsonResponse } from "@/lib/n8n-auth";
import syncOpenJobs from "../../../../../n8n-templates/sync-open-jobs.json";
import ingestJobs from "../../../../../n8n-templates/ingest-jobs-from-source.json";
import ingestCandidate from "../../../../../n8n-templates/ingest-candidate-submission.json";
import updateCandidate from "../../../../../n8n-templates/update-candidate-status.json";
import syncJobStatusChanges from "../../../../../n8n-templates/sync-job-status-changes.json";

const templates: Record<string, unknown> = {
  "sync-open-jobs": syncOpenJobs,
  "ingest-jobs-from-source": ingestJobs,
  "ingest-candidate-submission": ingestCandidate,
  "update-candidate-status": updateCandidate,
  "sync-job-status-changes": syncJobStatusChanges,
};

export const Route = createFileRoute("/api/public/n8n/templates/$templateName")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const template = templates[params.templateName];
        if (!template) {
          return jsonResponse(
            { error: "Template not found", available: Object.keys(templates) },
            404,
          );
        }
        return new Response(JSON.stringify(template, null, 2), {
          status: 200,
          headers: {
            "content-type": "application/json",
            "content-disposition": `attachment; filename="${params.templateName}.json"`,
          },
        });
      },
    },
  },
});
