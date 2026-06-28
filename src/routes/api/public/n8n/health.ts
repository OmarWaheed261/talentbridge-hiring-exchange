import { createFileRoute } from "@tanstack/react-router";
import { jsonResponse } from "@/lib/n8n-auth";

export const Route = createFileRoute("/api/public/n8n/health")({
  server: {
    handlers: {
      GET: async () =>
        jsonResponse({
          ok: true,
          service: "talentbridge-n8n-bridge",
          timestamp: new Date().toISOString(),
        }),
    },
  },
});
