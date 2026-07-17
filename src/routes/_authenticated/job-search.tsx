import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { toast } from "sonner";
import { Search, SlidersHorizontal, X, Bookmark, Save, ChevronLeft, ChevronRight, LayoutGrid, List, Radio } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { JobCard } from "@/components/JobCard";
import {
  searchCollectedJobs, toggleBookmark, listBookmarks,
  saveSearch, listSavedSearches, deleteSavedSearch,
} from "@/lib/job-search.functions";
import { supabase } from "@/integrations/supabase/client";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  location: fallback(z.string(), "").default(""),
  employment_type: fallback(z.string(), "").default(""),
  experience_level: fallback(z.string(), "").default(""),
  source: fallback(z.string(), "").default(""),
  skills: fallback(z.array(z.string()), []).default([]),
  tags: fallback(z.array(z.string()), []).default([]),
  sort: fallback(z.string(), "newest").default("newest"),
  view: fallback(z.string(), "cards").default("cards"),
  page: fallback(z.number().int(), 1).default(1),
});

export const Route = createFileRoute("/_authenticated/job-search")({
  validateSearch: zodValidator(searchSchema),
  component: JobSearchPage,
  head: () => ({
    meta: [
      { title: "Job Search — TalentBridge AI" },
      { name: "description", content: "Search collected jobs across Indeed, LinkedIn and career pages." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

const LOCATION_PRESETS = ["Remote", "United States", "California", "Texas", "Florida", "New York"];
const EMPLOYMENT_TYPES = ["full_time", "part_time", "contract", "contract_to_hire", "internship"];
const EXPERIENCE_LEVELS = ["entry", "junior", "mid", "senior", "lead", "principal"];
const SOURCES = ["indeed", "linkedin", "company_careers", "apify", "other"];
const SKILL_OPTIONS = [
  "Python","Java","React","Node.js","Angular","AWS","Azure","Machine Learning","AI","SQL",
  "Power BI","Tableau","JavaScript","TypeScript","Spring Boot","Docker","Kubernetes","DevOps",
  "Salesforce","SAP","Healthcare","Finance","Data Analyst","Business Analyst","Cybersecurity",
  "Cloud Engineer","Prompt Engineer",
];
const TAG_OPTIONS = [
  "Urgent Hiring","Visa Sponsorship","Remote","Hybrid","Fortune 500","Startup",
  "High Salary","Freshers","Immediate Joining","Recently Posted",
];
const PAGE_SIZE = 24;

function JobSearchPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/_authenticated/job-search" });
  const qc = useQueryClient();
  const fnSearch = useServerFn(searchCollectedJobs);
  const fnListBookmarks = useServerFn(listBookmarks);
  const fnToggleBookmark = useServerFn(toggleBookmark);
  const fnListSaved = useServerFn(listSavedSearches);
  const fnSaveSearch = useServerFn(saveSearch);
  const fnDeleteSaved = useServerFn(deleteSavedSearch);

  const [qDraft, setQDraft] = useState(search.q);
  useEffect(() => { setQDraft(search.q); }, [search.q]);
  useEffect(() => {
    const t = setTimeout(() => {
      if (qDraft !== search.q) {
        navigate({ search: (prev: any) => ({ ...prev, q: qDraft, page: 1 }), replace: true });
      }
    }, 350);
    return () => clearTimeout(t);
  }, [qDraft]);

  const [newCount, setNewCount] = useState(0);

  const params = useMemo(() => ({
    q: search.q, location: search.location, employment_type: search.employment_type,
    experience_level: search.experience_level, source: search.source,
    skills: search.skills, tags: search.tags,
    sort: (search.sort as any) || "newest",
    page: search.page, pageSize: PAGE_SIZE,
  }), [search]);

  const jobsQuery = useQuery({
    queryKey: ["job-search", params],
    queryFn: () => fnSearch({ data: params }),
  });

  const bookmarksQuery = useQuery({
    queryKey: ["job-bookmarks"],
    queryFn: () => fnListBookmarks(),
  });
  const bookmarkedSet = useMemo(() => new Set(bookmarksQuery.data ?? []), [bookmarksQuery.data]);

  const savedQuery = useQuery({
    queryKey: ["saved-searches"],
    queryFn: () => fnListSaved(),
  });

  const bookmarkMut = useMutation({
    mutationFn: (id: string) => fnToggleBookmark({ data: { collected_job_id: id } }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["job-bookmarks"] });
      toast.success(r.bookmarked ? "Bookmarked" : "Removed bookmark");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  // Realtime new jobs
  useEffect(() => {
    const ch = supabase
      .channel("job-search-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "collected_jobs" },
        () => setNewCount((c) => c + 1))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const total = jobsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const activeFilters = [
    search.location && { k: "location", v: search.location },
    search.employment_type && { k: "employment_type", v: search.employment_type },
    search.experience_level && { k: "experience_level", v: search.experience_level },
    search.source && { k: "source", v: search.source },
    ...search.skills.map((s: string) => ({ k: "skills", v: s })),
    ...search.tags.map((s: string) => ({ k: "tags", v: s })),
  ].filter(Boolean) as { k: string; v: string }[];

  const clearFilter = (k: string, v?: string) => {
    navigate({ search: (p: any) => {
      const next = { ...p, page: 1 };
      if (k === "skills" || k === "tags") next[k] = (p[k] as string[]).filter((x) => x !== v);
      else next[k] = "";
      return next;
    }, replace: true });
  };

  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveShared, setSaveShared] = useState(false);

  const doSave = async () => {
    if (!saveName.trim()) return;
    const { q, location, employment_type, experience_level, source, skills, tags, sort } = search;
    try {
      await fnSaveSearch({ data: {
        name: saveName.trim(),
        query: { q, location, employment_type, experience_level, source, skills, tags, sort },
        is_shared: saveShared,
      }});
      toast.success("Saved search");
      setSaveOpen(false); setSaveName(""); setSaveShared(false);
      qc.invalidateQueries({ queryKey: ["saved-searches"] });
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
  };

  const applySaved = (q: any) => {
    navigate({ search: (p: any) => ({ ...p, ...q, page: 1 }), replace: true });
  };

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="Job Search"
        description="Search every collected job across all sources."
        actions={
          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline"><Bookmark className="h-4 w-4 mr-2" />Saved searches</Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader><SheetTitle>Saved searches</SheetTitle></SheetHeader>
                <div className="mt-4 space-y-2">
                  {(savedQuery.data ?? []).length === 0 && (
                    <p className="text-sm text-muted-foreground">No saved searches yet.</p>
                  )}
                  {(savedQuery.data ?? []).map((s: any) => (
                    <div key={s.id} className="flex items-center justify-between border rounded-lg p-3">
                      <button className="text-left flex-1" onClick={() => applySaved(s.query)}>
                        <div className="font-medium text-sm">{s.name}</div>
                        {s.is_shared && <div className="text-xs text-muted-foreground">Shared with consultancy</div>}
                      </button>
                      <Button size="icon" variant="ghost" aria-label="Delete"
                        onClick={async () => { await fnDeleteSaved({ data: { id: s.id } }); qc.invalidateQueries({ queryKey: ["saved-searches"] }); }}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
            <Button variant="default" onClick={() => setSaveOpen(true)}>
              <Save className="h-4 w-4 mr-2" />Save current
            </Button>
          </div>
        }
      />

      {/* Live indicator */}
      {newCount > 0 && (
        <button
          onClick={() => { setNewCount(0); qc.invalidateQueries({ queryKey: ["job-search"] }); }}
          className="w-full text-sm bg-primary/10 border border-primary/30 text-primary rounded-lg px-3 py-2 hover:bg-primary/15 transition inline-flex items-center justify-center gap-2"
        >
          <Radio className="h-3.5 w-3.5 animate-pulse" />
          {newCount} new job{newCount === 1 ? "" : "s"} — refresh
        </button>
      )}

      {/* Search bar */}
      <div className="flex flex-col md:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search jobs, skills, companies, keywords…"
            value={qDraft}
            onChange={(e) => setQDraft(e.target.value)}
            className="pl-9 h-11"
          />
        </div>
        <div className="flex gap-2">
          <Select value={search.sort} onValueChange={(v) => navigate({ search: (p: any) => ({ ...p, sort: v, page: 1 }), replace: true })}>
            <SelectTrigger className="w-[170px] h-11"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="company">Company A–Z</SelectItem>
              <SelectItem value="relevance">Most relevant</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex border rounded-md overflow-hidden">
            <button aria-label="Card view" onClick={() => navigate({ search: (p: any) => ({ ...p, view: "cards" }), replace: true })}
              className={`px-3 h-11 ${search.view === "cards" ? "bg-primary/10 text-primary" : ""}`}><LayoutGrid className="h-4 w-4" /></button>
            <button aria-label="Table view" onClick={() => navigate({ search: (p: any) => ({ ...p, view: "table" }), replace: true })}
              className={`px-3 h-11 ${search.view === "table" ? "bg-primary/10 text-primary" : ""}`}><List className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        {/* Filter sidebar */}
        <Card className="h-fit sticky top-4">
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <div className="flex items-center gap-2 font-medium"><SlidersHorizontal className="h-4 w-4" />Filters</div>
            {activeFilters.length > 0 && (
              <button className="text-xs text-primary hover:underline"
                onClick={() => navigate({ search: (p: any) => ({ ...p, location: "", employment_type: "", experience_level: "", source: "", skills: [], tags: [], page: 1 }), replace: true })}>
                Clear all
              </button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <FilterBlock label="Location">
              <Select value={search.location || "any"} onValueChange={(v) => navigate({ search: (p: any) => ({ ...p, location: v === "any" ? "" : v, page: 1 }), replace: true })}>
                <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  {LOCATION_PRESETS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </FilterBlock>
            <FilterBlock label="Employment type">
              <Select value={search.employment_type || "any"} onValueChange={(v) => navigate({ search: (p: any) => ({ ...p, employment_type: v === "any" ? "" : v, page: 1 }), replace: true })}>
                <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  {EMPLOYMENT_TYPES.map((l) => <SelectItem key={l} value={l} className="capitalize">{l.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </FilterBlock>
            <FilterBlock label="Experience level">
              <Select value={search.experience_level || "any"} onValueChange={(v) => navigate({ search: (p: any) => ({ ...p, experience_level: v === "any" ? "" : v, page: 1 }), replace: true })}>
                <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  {EXPERIENCE_LEVELS.map((l) => <SelectItem key={l} value={l} className="capitalize">{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </FilterBlock>
            <FilterBlock label="Source">
              <Select value={search.source || "any"} onValueChange={(v) => navigate({ search: (p: any) => ({ ...p, source: v === "any" ? "" : v, page: 1 }), replace: true })}>
                <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  {SOURCES.map((l) => <SelectItem key={l} value={l} className="capitalize">{l.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </FilterBlock>
            <MultiSelect
              label="Skills"
              options={SKILL_OPTIONS}
              selected={search.skills}
              onChange={(next) => navigate({ search: (p: any) => ({ ...p, skills: next, page: 1 }), replace: true })}
            />
            <MultiSelect
              label="Tags"
              options={TAG_OPTIONS}
              selected={search.tags}
              onChange={(next) => navigate({ search: (p: any) => ({ ...p, tags: next, page: 1 }), replace: true })}
            />
          </CardContent>
        </Card>

        {/* Results */}
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground" aria-live="polite">
            <span>{jobsQuery.isLoading ? "Searching…" : `${total.toLocaleString()} job${total === 1 ? "" : "s"}`}</span>
            <span>Page {search.page} of {totalPages}</span>
          </div>

          {activeFilters.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {activeFilters.map((f) => (
                <Badge key={`${f.k}-${f.v}`} variant="secondary" className="gap-1">
                  {f.v}
                  <button onClick={() => clearFilter(f.k, f.v)} aria-label={`Remove ${f.v}`}><X className="h-3 w-3" /></button>
                </Badge>
              ))}
            </div>
          )}

          {search.view === "cards" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(jobsQuery.data?.jobs ?? []).map((j: any) => (
                <JobCard key={j.id} job={j}
                  bookmarked={bookmarkedSet.has(j.id)}
                  onToggleBookmark={(id) => bookmarkMut.mutate(id)} />
              ))}
              {!jobsQuery.isLoading && (jobsQuery.data?.jobs ?? []).length === 0 && (
                <Card className="col-span-full p-10 text-center text-muted-foreground">No jobs match your filters.</Card>
              )}
            </div>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left">
                    <tr>
                      <th className="px-3 py-2">Title</th>
                      <th className="px-3 py-2">Company</th>
                      <th className="px-3 py-2">Location</th>
                      <th className="px-3 py-2">Source</th>
                      <th className="px-3 py-2">Posted</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(jobsQuery.data?.jobs ?? []).map((j: any) => (
                      <tr key={j.id} className="border-t hover:bg-muted/30">
                        <td className="px-3 py-2 font-medium">{j.job_title}</td>
                        <td className="px-3 py-2">{j.company_name}</td>
                        <td className="px-3 py-2">{j.location ?? "—"}</td>
                        <td className="px-3 py-2 capitalize">{j.source ?? "—"}</td>
                        <td className="px-3 py-2">{j.posted_date ? new Date(j.posted_date).toLocaleDateString() : "—"}</td>
                        <td className="px-3 py-2 text-right">
                          <Button asChild size="sm" variant="ghost">
                            <a href={`/job-search/${j.id}`}>Open</a>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" disabled={search.page <= 1}
              onClick={() => navigate({ search: (p: any) => ({ ...p, page: Math.max(1, p.page - 1) }), replace: true })}>
              <ChevronLeft className="h-4 w-4" />Prev
            </Button>
            <Button variant="outline" size="sm" disabled={search.page >= totalPages}
              onClick={() => navigate({ search: (p: any) => ({ ...p, page: p.page + 1 }), replace: true })}>
              Next<ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Save this search</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input value={saveName} onChange={(e) => setSaveName(e.target.value)}
                placeholder="e.g. Remote Python jobs" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={saveShared} onCheckedChange={(v) => setSaveShared(!!v)} />
              Share with my consultancy
            </label>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSaveOpen(false)}>Cancel</Button>
            <Button onClick={doSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FilterBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function MultiSelect({ label, options, selected, onChange }: {
  label: string; options: string[]; selected: string[]; onChange: (next: string[]) => void;
}) {
  const [filter, setFilter] = useState("");
  const filtered = options.filter((o) => o.toLowerCase().includes(filter.toLowerCase()));
  const toggle = (opt: string) => {
    onChange(selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt]);
  };
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      <Input placeholder={`Filter ${label.toLowerCase()}…`} value={filter} onChange={(e) => setFilter(e.target.value)} className="h-8 text-xs" />
      <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
        {filtered.map((o) => (
          <label key={o} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/40 rounded px-1 py-0.5">
            <Checkbox checked={selected.includes(o)} onCheckedChange={() => toggle(o)} />
            <span>{o}</span>
          </label>
        ))}
        {filtered.length === 0 && <div className="text-xs text-muted-foreground px-1">No matches</div>}
      </div>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map((s) => (
            <Badge key={s} variant="secondary" className="gap-1 text-xs">
              {s}<button onClick={() => toggle(s)} aria-label={`Remove ${s}`}><X className="h-3 w-3" /></button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
