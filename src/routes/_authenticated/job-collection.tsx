import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import {
  Search, RefreshCw, Download, ExternalLink, Trash2, Zap, Filter, Radio,
  ArrowUp, ArrowDown, ArrowUpDown, ChevronLeft, ChevronRight, FileSpreadsheet, FileText,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const SORTABLE = ["created_at", "posted_date", "company_name", "location", "source", "status", "job_title"] as const;
type SortKey = (typeof SORTABLE)[number];

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  status: fallback(z.enum(["all", "new", "processed", "shared"]), "all").default("all"),
  source: fallback(z.string(), "all").default("all"),
  company: fallback(z.string(), "all").default("all"),
  location: fallback(z.string(), "all").default("all"),
  skill: fallback(z.string(), "all").default("all"),
  sort: fallback(z.enum(SORTABLE), "created_at").default("created_at"),
  dir: fallback(z.enum(["asc", "desc"]), "desc").default("desc"),
  page: fallback(z.number().int().min(1), 1).default(1),
});

const PAGE_SIZE = 25;

export const Route = createFileRoute("/_authenticated/job-collection")({
  validateSearch: zodValidator(searchSchema),
  component: JobCollectionPage,
  head: () => ({
    meta: [
      { title: "Job Collection Engine — TalentBridge AI" },
      {
        name: "description",
        content:
          "Automated intake of external job postings scraped from Indeed, LinkedIn, and company career pages via Apify and n8n.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

type CollectedJob = {
  id: string;
  job_title: string;
  company_name: string;
  location: string | null;
  skills: string[];
  job_url: string | null;
  source: string | null;
  description: string | null;
  posted_date: string | null;
  status: "new" | "processed" | "shared";
  created_at: string;
};

const statusVariants: Record<string, string> = {
  new: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  processed: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  shared: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
};

function JobCollectionPage() {
  const qc = useQueryClient();
  const { roles } = useAuth();
  const isAdmin = roles.includes("super_admin");
  const params = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const setParam = <K extends keyof typeof params>(key: K, value: (typeof params)[K]) => {
    navigate({ search: (prev: typeof params) => ({ ...prev, [key]: value, page: key === "page" ? (value as number) : 1 }) });
  };

  // Debounce search input so we don't slam the DB on each keystroke
  const [searchDraft, setSearchDraft] = useState(params.q);
  useEffect(() => { setSearchDraft(params.q); }, [params.q]);
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchDraft !== params.q) setParam("q", searchDraft);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchDraft]);

  const [selected, setSelected] = useState<CollectedJob | null>(null);
  const [live, setLive] = useState(true);

  // Main paginated query — applies all filters + sort + range on the server
  const { data: result, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["collected_jobs", params],
    queryFn: async () => {
      let q = supabase.from("collected_jobs").select("*", { count: "exact" });

      if (params.status !== "all") q = q.eq("status", params.status);
      if (params.source !== "all") q = q.eq("source", params.source);
      if (params.company !== "all") q = q.eq("company_name", params.company);
      if (params.location !== "all") q = q.eq("location", params.location);
      if (params.skill !== "all") q = q.contains("skills", [params.skill]);

      if (params.q.trim()) {
        const term = params.q.trim().replace(/[%,]/g, "");
        q = q.or(
          `job_title.ilike.%${term}%,company_name.ilike.%${term}%,location.ilike.%${term}%`,
        );
      }

      q = q.order(params.sort, { ascending: params.dir === "asc", nullsFirst: false });
      if (params.sort !== "created_at") {
        // tie-breaker for stable pagination
        q = q.order("created_at", { ascending: false });
      }

      const from = (params.page - 1) * PAGE_SIZE;
      q = q.range(from, from + PAGE_SIZE - 1);

      const { data, error, count } = await q;
      if (error) throw error;
      return { rows: (data ?? []) as CollectedJob[], total: count ?? 0 };
    },
    placeholderData: (prev) => prev,
  });

  const jobs = result?.rows ?? [];
  const total = result?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Distinct values for filter dropdowns (separate small queries; cached longer)
  const { data: facets } = useQuery({
    queryKey: ["collected_jobs_facets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collected_jobs")
        .select("company_name, location, source, skills")
        .limit(2000);
      if (error) throw error;
      const companies = new Set<string>();
      const locations = new Set<string>();
      const sources = new Set<string>();
      const skills = new Set<string>();
      for (const r of data ?? []) {
        if (r.company_name) companies.add(r.company_name);
        if (r.location) locations.add(r.location);
        if (r.source) sources.add(r.source);
        for (const s of (r.skills ?? []) as string[]) skills.add(s);
      }
      return {
        companies: [...companies].sort(),
        locations: [...locations].sort(),
        sources: [...sources].sort(),
        skills: [...skills].sort().slice(0, 200),
      };
    },
    staleTime: 60_000,
  });

  // Status counts for stat cards (lightweight head queries)
  const { data: counts } = useQuery({
    queryKey: ["collected_jobs_counts"],
    queryFn: async () => {
      const make = (status?: string) => {
        let q = supabase.from("collected_jobs").select("id", { count: "exact", head: true });
        if (status) q = q.eq("status", status);
        return q;
      };
      const [all, n, p, s] = await Promise.all([make(), make("new"), make("processed"), make("shared")]);
      return { total: all.count ?? 0, new: n.count ?? 0, processed: p.count ?? 0, shared: s.count ?? 0 };
    },
    staleTime: 30_000,
  });

  // Realtime subscription
  useEffect(() => {
    if (!live) return;
    const channel = supabase
      .channel("collected_jobs_rt")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "collected_jobs" },
        (payload) => {
          const row = payload.new as { job_title?: string; company_name?: string };
          toast.success(`New job ingested: ${row.job_title ?? "Untitled"}`, {
            description: row.company_name ?? undefined,
          });
          qc.invalidateQueries({ queryKey: ["collected_jobs"] });
          qc.invalidateQueries({ queryKey: ["collected_jobs_counts"] });
          qc.invalidateQueries({ queryKey: ["collected_jobs_facets"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "collected_jobs" },
        (payload) => {
          const oldRow = payload.old as { status?: string };
          const newRow = payload.new as { job_title?: string; status?: string };
          if (oldRow.status !== newRow.status) {
            toast.message(`${newRow.job_title ?? "Job"} → ${newRow.status ?? ""}`);
          }
          qc.invalidateQueries({ queryKey: ["collected_jobs"] });
          qc.invalidateQueries({ queryKey: ["collected_jobs_counts"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "collected_jobs" },
        () => {
          qc.invalidateQueries({ queryKey: ["collected_jobs"] });
          qc.invalidateQueries({ queryKey: ["collected_jobs_counts"] });
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [live, qc]);

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: CollectedJob["status"] }) => {
      const { error } = await supabase.from("collected_jobs").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status updated");
      qc.invalidateQueries({ queryKey: ["collected_jobs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("collected_jobs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Job removed");
      qc.invalidateQueries({ queryKey: ["collected_jobs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const clearDuplicates = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("collected_jobs")
        .select("id, job_url, job_title, company_name, created_at")
        .order("created_at", { ascending: true });
      if (error) throw error;
      const seen = new Map<string, string>();
      const toDelete: string[] = [];
      for (const j of data ?? []) {
        const key = (j.job_url ?? `${j.job_title}|${j.company_name}`).toLowerCase();
        if (seen.has(key)) toDelete.push(j.id);
        else seen.set(key, j.id);
      }
      if (toDelete.length === 0) return 0;
      const { error: delErr } = await supabase.from("collected_jobs").delete().in("id", toDelete);
      if (delErr) throw delErr;
      return toDelete.length;
    },
    onSuccess: (n) => {
      toast.success(n ? `Removed ${n} duplicate${n === 1 ? "" : "s"}` : "No duplicates found");
      qc.invalidateQueries({ queryKey: ["collected_jobs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const fetchAllFiltered = async (): Promise<CollectedJob[]> => {
    const rows: CollectedJob[] = [];
    const CHUNK = 1000;
    let from = 0;
    // Cap to avoid pulling unbounded datasets in the browser
    const HARD_CAP = 10_000;
    while (from < HARD_CAP) {
      let q = supabase.from("collected_jobs").select("*");
      if (params.status !== "all") q = q.eq("status", params.status);
      if (params.source !== "all") q = q.eq("source", params.source);
      if (params.company !== "all") q = q.eq("company_name", params.company);
      if (params.location !== "all") q = q.eq("location", params.location);
      if (params.skill !== "all") q = q.contains("skills", [params.skill]);
      if (params.q.trim()) {
        const term = params.q.trim().replace(/[%,]/g, "");
        q = q.or(`job_title.ilike.%${term}%,company_name.ilike.%${term}%,location.ilike.%${term}%`);
      }
      q = q.order(params.sort, { ascending: params.dir === "asc", nullsFirst: false });
      if (params.sort !== "created_at") q = q.order("created_at", { ascending: false });
      q = q.range(from, from + CHUNK - 1);
      const { data, error } = await q;
      if (error) throw error;
      const batch = (data ?? []) as CollectedJob[];
      rows.push(...batch);
      if (batch.length < CHUNK) break;
      from += CHUNK;
    }
    return rows;
  };

  const buildExportRows = (data: CollectedJob[]) =>
    data.map((j) => ({
      job_title: j.job_title,
      company_name: j.company_name,
      location: j.location ?? "",
      skills: (j.skills ?? []).join("|"),
      source: j.source ?? "",
      job_url: j.job_url ?? "",
      posted_date: j.posted_date ?? "",
      status: j.status,
      created_at: j.created_at,
    }));

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCsv = (rows: CollectedJob[], suffix: string) => {
    const exportRows = buildExportRows(rows);
    const header = Object.keys(exportRows[0] ?? {
      job_title: "", company_name: "", location: "", skills: "", source: "",
      job_url: "", posted_date: "", status: "", created_at: "",
    });
    const lines = [header.join(",")];
    for (const r of exportRows) {
      const row = header.map((k) => `"${String((r as Record<string, unknown>)[k] ?? "").replace(/"/g, '""')}"`);
      lines.push(row.join(","));
    }
    // BOM so Excel opens UTF-8 cleanly
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    triggerDownload(blob, `collected-jobs-${suffix}-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const exportXlsx = (rows: CollectedJob[], suffix: string) => {
    const exportRows = buildExportRows(rows);
    const ws = XLSX.utils.json_to_sheet(exportRows);
    ws["!cols"] = [
      { wch: 36 }, { wch: 26 }, { wch: 22 }, { wch: 30 }, { wch: 14 },
      { wch: 50 }, { wch: 20 }, { wch: 12 }, { wch: 20 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Collected Jobs");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
    const blob = new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    triggerDownload(blob, `collected-jobs-${suffix}-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const [exporting, setExporting] = useState(false);
  const handleExport = async (format: "csv" | "xlsx", scope: "page" | "all") => {
    try {
      setExporting(true);
      const rows = scope === "page" ? jobs : await fetchAllFiltered();
      if (rows.length === 0) {
        toast.message("Nothing to export with the current filters.");
        return;
      }
      if (format === "csv") exportCsv(rows, scope);
      else exportXlsx(rows, scope);
      toast.success(`Exported ${rows.length} job${rows.length === 1 ? "" : "s"} (${format.toUpperCase()})`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setExporting(false);
    }
  };


  const triggerSync = async () => {
    toast.info("Triggering manual sync…");
    try {
      const { error } = await supabase.from("collected_jobs").insert({
        job_title: "Manual Sync Test Job",
        company_name: "Apify Test",
        location: "Remote",
        skills: ["test", "sync"],
        source: "manual",
        job_url: `https://example.com/job/${crypto.randomUUID()}`,
        posted_date: new Date().toISOString(),
        status: "new",
      });
      if (error) throw error;
      toast.success("Synthetic job inserted. In production, this triggers your Apify workflow.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const toggleSort = (key: SortKey) => {
    if (params.sort === key) {
      navigate({ search: (prev: typeof params) => ({ ...prev, dir: prev.dir === "asc" ? "desc" : "asc", page: 1 }) });
    } else {
      navigate({ search: (prev: typeof params) => ({ ...prev, sort: key, dir: "desc", page: 1 }) });
    }
  };

  const sortIcon = (key: SortKey) => {
    if (params.sort !== key) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return params.dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  return (
    <>
      <PageHeader
        title="Job Collection Engine"
        description="Automated intake of external job postings from Indeed, LinkedIn, and company career pages via Apify and n8n."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={exporting}>
                  <Download className={`h-4 w-4 mr-2 ${exporting ? "animate-pulse" : ""}`} />
                  {exporting ? "Exporting…" : "Export"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Current page ({jobs.length})</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleExport("csv", "page")}>
                  <FileText className="h-4 w-4 mr-2" /> CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("xlsx", "page")}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>All filtered ({total})</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleExport("csv", "all")}>
                  <FileText className="h-4 w-4 mr-2" /> CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("xlsx", "all")}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel (.xlsx)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {isAdmin && (
              <>
                <Button variant="outline" size="sm" onClick={() => clearDuplicates.mutate()}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear duplicates
                </Button>
                <Button size="sm" onClick={triggerSync}>
                  <Zap className="h-4 w-4 mr-2" />
                  Trigger sync
                </Button>
              </>
            )}
          </>
        }
      />

      <div className="p-6 lg:p-10 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total collected", value: counts?.total ?? 0, accent: "from-primary/20 to-primary/5" },
            { label: "New", value: counts?.new ?? 0, accent: "from-blue-500/20 to-blue-500/5" },
            { label: "Processed", value: counts?.processed ?? 0, accent: "from-amber-500/20 to-amber-500/5" },
            { label: "Shared", value: counts?.shared ?? 0, accent: "from-emerald-500/20 to-emerald-500/5" },
          ].map((s) => (
            <div key={s.label}
              className={`rounded-xl border border-border/60 bg-gradient-to-br ${s.accent} p-5 backdrop-blur transition-base hover:shadow-md`}>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</div>
              <div className="text-3xl font-bold mt-1">{s.value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search title, company, location…"
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                className="pl-9"
              />
            </div>
            <button
              type="button"
              onClick={() => setLive((v) => !v)}
              aria-pressed={live}
              aria-label={live ? "Realtime updates on — click to pause" : "Realtime updates paused — click to resume"}
              className={`inline-flex items-center gap-2 text-xs px-3 py-2 rounded-lg border transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                live ? "border-emerald-500/40 text-emerald-600 bg-emerald-500/10" : "border-border text-muted-foreground"
              }`}
              title="Toggle realtime updates"
            >
              <Radio aria-hidden="true" className={`h-3.5 w-3.5 ${live ? "animate-pulse" : ""}`} />
              {live ? "Live" : "Paused"}
            </button>

          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <FilterSelect value={params.status} onChange={(v) => setParam("status", v as typeof params.status)} label="Status"
              options={[{ value: "all", label: "All status" }, { value: "new", label: "New" }, { value: "processed", label: "Processed" }, { value: "shared", label: "Shared" }]} />
            <FilterSelect value={params.source} onChange={(v) => setParam("source", v)} label="Source"
              options={[{ value: "all", label: "All sources" }, ...(facets?.sources ?? []).map((s) => ({ value: s, label: s }))]} />
            <FilterSelect value={params.company} onChange={(v) => setParam("company", v)} label="Company"
              options={[{ value: "all", label: "All companies" }, ...(facets?.companies ?? []).map((s) => ({ value: s, label: s }))]} />
            <FilterSelect value={params.location} onChange={(v) => setParam("location", v)} label="Location"
              options={[{ value: "all", label: "All locations" }, ...(facets?.locations ?? []).map((s) => ({ value: s, label: s }))]} />
            <FilterSelect value={params.skill} onChange={(v) => setParam("skill", v)} label="Skill"
              options={[{ value: "all", label: "All skills" }, ...(facets?.skills ?? []).map((s) => ({ value: s, label: s }))]} />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate({ search: () => ({ q: "", status: "all", source: "all", company: "all", location: "all", skill: "all", sort: "created_at", dir: "desc", page: 1 }) })}
            >
              Reset
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table aria-label="Collected jobs" aria-rowcount={total}>
              <caption className="sr-only">
                Collected jobs. Use Tab to move between rows and column headers; press Enter or Space on a header to sort, or on a row to view details.
              </caption>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <SortHead label="Job Title" k="job_title" sortKey={params.sort} dir={params.dir} icon={sortIcon} onClick={toggleSort} />
                  <SortHead label="Company" k="company_name" sortKey={params.sort} dir={params.dir} icon={sortIcon} onClick={toggleSort} />
                  <SortHead label="Location" k="location" sortKey={params.sort} dir={params.dir} icon={sortIcon} onClick={toggleSort} />
                  <TableHead scope="col">Skills</TableHead>
                  <SortHead label="Source" k="source" sortKey={params.sort} dir={params.dir} icon={sortIcon} onClick={toggleSort} />
                  <SortHead label="Posted" k="posted_date" sortKey={params.sort} dir={params.dir} icon={sortIcon} onClick={toggleSort} />
                  <SortHead label="Status" k="status" sortKey={params.sort} dir={params.dir} icon={sortIcon} onClick={toggleSort} />
                  <TableHead scope="col" className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody aria-busy={isLoading || isFetching}>
                {isLoading && (
                  <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">Loading…</TableCell></TableRow>
                )}
                {!isLoading && jobs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                      No jobs match the current filters.
                    </TableCell>
                  </TableRow>
                )}

                {jobs.map((j) => (
                  <TableRow
                    key={j.id}
                    tabIndex={0}
                    role="button"
                    aria-label={`View details for ${j.job_title} at ${j.company_name}`}
                    className="cursor-pointer hover:bg-muted/30 transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                    onClick={() => setSelected(j)}
                    onKeyDown={(e) => {
                      if (e.target !== e.currentTarget) return;
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelected(j);
                      }
                    }}
                  >
                    <TableCell className="font-medium max-w-[280px] truncate">{j.job_title}</TableCell>
                    <TableCell className="text-muted-foreground">{j.company_name}</TableCell>
                    <TableCell className="text-muted-foreground">{j.location ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[220px]">
                        {(j.skills ?? []).slice(0, 3).map((s) => (
                          <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                        ))}
                        {(j.skills ?? []).length > 3 && (
                          <span className="text-[10px] text-muted-foreground">+{j.skills.length - 3}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{j.source ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {j.posted_date ? new Date(j.posted_date).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge className={`border ${statusVariants[j.status]}`} variant="outline">{j.status}</Badge>
                    </TableCell>
                    <TableCell
                      className="text-right"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <Select
                        value={j.status}
                        onValueChange={(v) => updateStatus.mutate({ id: j.id, status: v as CollectedJob["status"] })}
                      >
                        <SelectTrigger className="h-8 w-[130px] ml-auto" aria-label={`Change status for ${j.job_title}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">Mark as New</SelectItem>
                          <SelectItem value="processed">Mark as Processed</SelectItem>
                          <SelectItem value="shared">Mark as Shared</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <nav
            aria-label="Job collection pagination"
            className="flex items-center justify-between px-4 py-3 border-t border-border/60 text-sm"
          >
            <div className="text-muted-foreground" aria-live="polite" aria-atomic="true">
              {total === 0
                ? "0 results"
                : `Showing ${(params.page - 1) * PAGE_SIZE + 1}–${Math.min(params.page * PAGE_SIZE, total)} of ${total}`}
              {isFetching && <span className="ml-2 text-xs">· updating…</span>}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                aria-label={`Go to previous page${params.page > 1 ? `, page ${params.page - 1}` : ""}`}
                disabled={params.page <= 1}
                onClick={() => setParam("page", params.page - 1)}
              >
                <ChevronLeft aria-hidden="true" className="h-4 w-4" />
                <span className="sr-only">Previous</span>
              </Button>
              <span className="text-xs text-muted-foreground" aria-current="page">
                Page {params.page} of {pageCount}
              </span>
              <Button
                variant="outline"
                size="sm"
                aria-label={`Go to next page${params.page < pageCount ? `, page ${params.page + 1}` : ""}`}
                disabled={params.page >= pageCount}
                onClick={() => setParam("page", params.page + 1)}
              >
                <ChevronRight aria-hidden="true" className="h-4 w-4" />
                <span className="sr-only">Next</span>
              </Button>
            </div>
          </nav>
        </div>

      </div>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">{selected.job_title}</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  {selected.company_name}{selected.location ? ` · ${selected.location}` : ""}
                </p>
              </DialogHeader>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                <div className="flex flex-wrap gap-2">
                  <Badge className={`border ${statusVariants[selected.status]}`} variant="outline">{selected.status}</Badge>
                  {selected.source && <Badge variant="secondary">{selected.source}</Badge>}
                  {selected.posted_date && (
                    <Badge variant="outline">Posted {new Date(selected.posted_date).toLocaleDateString()}</Badge>
                  )}
                </div>
                {(selected.skills?.length ?? 0) > 0 && (
                  <div>
                    <div className="text-xs uppercase text-muted-foreground mb-1.5">Skills</div>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.skills.map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}
                    </div>
                  </div>
                )}
                {selected.description && (
                  <div>
                    <div className="text-xs uppercase text-muted-foreground mb-1.5">Description</div>
                    <div className="text-sm whitespace-pre-wrap leading-relaxed">{selected.description}</div>
                  </div>
                )}
              </div>
              <DialogFooter className="flex flex-wrap gap-2 sm:justify-between">
                <div className="flex gap-2">
                  {isAdmin && (
                    <Button variant="destructive" size="sm" onClick={() => { del.mutate(selected.id); setSelected(null); }}>
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </Button>
                  )}
                </div>
                {selected.job_url && (
                  <a href={selected.job_url} target="_blank" rel="noopener noreferrer">
                    <Button size="sm">
                      View original <ExternalLink className="h-4 w-4 ml-2" />
                    </Button>
                  </a>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function SortHead({
  label, k, sortKey, icon, onClick,
}: {
  label: string;
  k: SortKey;
  sortKey: SortKey;
  icon: (k: SortKey) => React.ReactNode;
  onClick: (k: SortKey) => void;
}) {
  return (
    <TableHead>
      <button
        onClick={() => onClick(k)}
        className={`inline-flex items-center gap-1.5 hover:text-foreground transition-base ${
          sortKey === k ? "text-foreground font-medium" : ""
        }`}
      >
        {label}
        {icon(k)}
      </button>
    </TableHead>
  );
}

function FilterSelect({
  value, onChange, label, options,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  options: { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-[170px]">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent className="max-h-[300px]">
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
