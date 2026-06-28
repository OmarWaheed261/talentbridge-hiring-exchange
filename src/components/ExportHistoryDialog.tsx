import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, FileText, History } from "lucide-react";

type AuditRow = {
  id: string;
  user_id: string;
  format: "csv" | "xlsx";
  scope: "page" | "all";
  row_count: number;
  filters: Record<string, unknown>;
  created_at: string;
};

export function ExportHistoryDialog({
  open,
  onOpenChange,
  pageKey,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pageKey: string;
}) {
  const { roles } = useAuth();
  const isAdmin = roles.includes("super_admin");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["export_audit_log", pageKey, isAdmin],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("export_audit_log")
        .select("id, user_id, format, scope, row_count, filters, created_at")
        .eq("page_key", pageKey)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as AuditRow[];
    },
  });

  const fmtFilters = (f: Record<string, unknown>) => {
    const entries = Object.entries(f).filter(([, v]) => v && v !== "all" && v !== "");
    if (entries.length === 0) return "no filters";
    return entries.map(([k, v]) => `${k}=${String(v)}`).join(" · ");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-4 w-4" /> Export history
          </DialogTitle>
          <DialogDescription>
            {isAdmin
              ? "Last 50 exports across all users for this page."
              : "Last 50 exports you have run on this page."}
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto -mx-6 px-6 space-y-2">
          {isLoading && <p className="text-sm text-muted-foreground py-6">Loading…</p>}
          {!isLoading && rows.length === 0 && (
            <p className="text-sm text-muted-foreground py-6">No exports recorded yet.</p>
          )}
          {rows.map((r) => (
            <div
              key={r.id}
              className="rounded-lg border border-border/60 bg-card/50 p-3 text-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {r.format === "csv" ? (
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="font-medium uppercase">{r.format}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {r.scope === "page" ? "current page" : "all filtered"}
                  </Badge>
                  <span className="text-muted-foreground">
                    {r.row_count.toLocaleString()} row{r.row_count === 1 ? "" : "s"}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleString()}
                </span>
              </div>
              <div className="text-xs text-muted-foreground mt-1 truncate">
                {fmtFilters(r.filters)}
              </div>
              {isAdmin && (
                <div className="text-[10px] text-muted-foreground/70 mt-1 font-mono">
                  user: {r.user_id}
                </div>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
