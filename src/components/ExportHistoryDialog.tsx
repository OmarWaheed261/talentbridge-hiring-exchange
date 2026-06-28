import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format as formatDate } from "date-fns";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import {
  CalendarIcon,
  FileSpreadsheet,
  FileText,
  History,
  Search,
  X,
} from "lucide-react";
import type { DateRange } from "react-day-picker";

type AuditRow = {
  id: string;
  user_id: string;
  format: "csv" | "xlsx";
  scope: "page" | "all";
  row_count: number;
  filters: Record<string, unknown>;
  created_at: string;
};

type FormatFilter = "all" | "csv" | "xlsx";
type StatusFilter = "all" | "page" | "all_filtered";
type RowsBucket = "any" | "lt100" | "100to1k" | "1kto10k" | "gt10k";

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

  const [search, setSearch] = useState("");
  const [formatFilter, setFormatFilter] = useState<FormatFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [rowsFilter, setRowsFilter] = useState<RowsBucket>("any");
  const [range, setRange] = useState<DateRange | undefined>();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["export_audit_log", pageKey, isAdmin],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("export_audit_log")
        .select("id, user_id, format, scope, row_count, filters, created_at")
        .eq("page_key", pageKey)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as AuditRow[];
    },
  });

  const fmtFilters = (f: Record<string, unknown>) => {
    const entries = Object.entries(f).filter(([, v]) => v && v !== "all" && v !== "");
    if (entries.length === 0) return "no filters";
    return entries.map(([k, v]) => `${k}=${String(v)}`).join(" · ");
  };

  const matchesRows = (n: number) => {
    switch (rowsFilter) {
      case "lt100": return n < 100;
      case "100to1k": return n >= 100 && n < 1000;
      case "1kto10k": return n >= 1000 && n < 10000;
      case "gt10k": return n >= 10000;
      default: return true;
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const fromTs = range?.from ? new Date(range.from.setHours(0, 0, 0, 0)).getTime() : null;
    const toTs = range?.to ? new Date(range.to.setHours(23, 59, 59, 999)).getTime() : null;
    return rows.filter((r) => {
      if (formatFilter !== "all" && r.format !== formatFilter) return false;
      if (statusFilter !== "all") {
        const wanted = statusFilter === "page" ? "page" : "all";
        if (r.scope !== wanted) return false;
      }
      if (!matchesRows(r.row_count)) return false;
      const created = new Date(r.created_at).getTime();
      if (fromTs && created < fromTs) return false;
      if (toTs && created > toTs) return false;
      if (q) {
        const hay = `${r.format} ${r.scope} ${r.row_count} ${fmtFilters(r.filters)} ${r.user_id}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, search, formatFilter, statusFilter, rowsFilter, range]);

  const hasActiveFilters =
    search !== "" ||
    formatFilter !== "all" ||
    statusFilter !== "all" ||
    rowsFilter !== "any" ||
    range?.from ||
    range?.to;

  const clearAll = () => {
    setSearch("");
    setFormatFilter("all");
    setStatusFilter("all");
    setRowsFilter("any");
    setRange(undefined);
  };

  const rangeLabel = range?.from
    ? range.to
      ? `${formatDate(range.from, "LLL d")} – ${formatDate(range.to, "LLL d, y")}`
      : formatDate(range.from, "LLL d, y")
    : "Any date";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-4 w-4" /> Export history
          </DialogTitle>
          <DialogDescription>
            {isAdmin
              ? "Most recent exports across all users for this page."
              : "Most recent exports you have run on this page."}
          </DialogDescription>
        </DialogHeader>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pb-2 border-b border-border/60">
          <div className="sm:col-span-5">
            <Label htmlFor="export-history-search" className="sr-only">Search exports</Label>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="export-history-search"
                placeholder="Search filters, user, format…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
          </div>

          <div className="sm:col-span-2">
            <Select value={formatFilter} onValueChange={(v) => setFormatFilter(v as FormatFilter)}>
              <SelectTrigger className="h-9" aria-label="Filter by format">
                <SelectValue placeholder="Format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All formats</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="xlsx">Excel</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="sm:col-span-2">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="h-9" aria-label="Filter by scope">
                <SelectValue placeholder="Scope" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any scope</SelectItem>
                <SelectItem value="page">Current page</SelectItem>
                <SelectItem value="all_filtered">All filtered</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="sm:col-span-3">
            <Select value={rowsFilter} onValueChange={(v) => setRowsFilter(v as RowsBucket)}>
              <SelectTrigger className="h-9" aria-label="Filter by row count">
                <SelectValue placeholder="Row count" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any row count</SelectItem>
                <SelectItem value="lt100">&lt; 100 rows</SelectItem>
                <SelectItem value="100to1k">100 – 999 rows</SelectItem>
                <SelectItem value="1kto10k">1k – 9,999 rows</SelectItem>
                <SelectItem value="gt10k">10,000+ rows</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="sm:col-span-9">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "h-9 w-full justify-start text-left font-normal",
                    !range?.from && "text-muted-foreground",
                  )}
                  aria-label="Filter by date range"
                >
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {rangeLabel}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={range}
                  onSelect={setRange}
                  numberOfMonths={2}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="sm:col-span-3 flex">
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-full"
              onClick={clearAll}
              disabled={!hasActiveFilters}
            >
              <X className="h-4 w-4 mr-1" /> Clear filters
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2" aria-live="polite">
          <span>
            {isLoading
              ? "Loading…"
              : `${filtered.length} of ${rows.length} export${rows.length === 1 ? "" : "s"}`}
          </span>
        </div>

        <div className="overflow-y-auto -mx-6 px-6 space-y-2">
          {!isLoading && filtered.length === 0 && (
            <p className="text-sm text-muted-foreground py-6">
              {rows.length === 0
                ? "No exports recorded yet."
                : "No exports match your filters."}
            </p>
          )}
          {filtered.map((r) => (
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
