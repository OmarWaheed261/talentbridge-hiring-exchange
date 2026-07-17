import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft, Bookmark, BookmarkCheck, ExternalLink, Share2, MapPin, Building2, Calendar, Briefcase, DollarSign, UserCheck,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { getCollectedJob, toggleBookmark, listBookmarks } from "@/lib/job-search.functions";

export const Route = createFileRoute("/_authenticated/job-search/$jobId")({
  component: JobDetailPage,
  head: () => ({
    meta: [
      { title: "Job details — TalentBridge AI" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function JobDetailPage() {
  const { jobId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fnGet = useServerFn(getCollectedJob);
  const fnToggle = useServerFn(toggleBookmark);
  const fnBookmarks = useServerFn(listBookmarks);

  const jobQ = useQuery({ queryKey: ["collected-job", jobId], queryFn: () => fnGet({ data: { id: jobId } }) });
  const bmQ = useQuery({ queryKey: ["job-bookmarks"], queryFn: () => fnBookmarks() });
  const bookmarked = (bmQ.data ?? []).includes(jobId);

  const toggleMut = useMutation({
    mutationFn: () => fnToggle({ data: { collected_job_id: jobId } }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["job-bookmarks"] });
      toast.success(r.bookmarked ? "Bookmarked" : "Removed bookmark");
    },
  });

  const share = async () => {
    const url = window.location.href;
    try { await navigator.clipboard.writeText(url); toast.success("Link copied"); }
    catch { toast.error("Copy failed"); }
  };

  if (jobQ.isLoading) return <div className="p-6 text-muted-foreground">Loading…</div>;
  const j: any = jobQ.data;
  if (!j) return <div className="p-6">Job not found.</div>;

  const posted = j.posted_date || j.created_at;

  return (
    <div className="p-6 space-y-4 max-w-5xl">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/job-search" search={(p: any) => p}><ArrowLeft className="h-4 w-4 mr-1" />Back to search</Link>
      </Button>

      <PageHeader
        title={j.job_title}
        description={j.company_name}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => toggleMut.mutate()}>
              {bookmarked ? <BookmarkCheck className="h-4 w-4 mr-2 text-primary" /> : <Bookmark className="h-4 w-4 mr-2" />}
              {bookmarked ? "Bookmarked" : "Bookmark"}
            </Button>
            <Button variant="outline" onClick={share}><Share2 className="h-4 w-4 mr-2" />Share</Button>
            <Button onClick={() => navigate({ to: "/candidates" })}>
              <UserCheck className="h-4 w-4 mr-2" />Submit candidate
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Job description</CardTitle></CardHeader>
          <CardContent>
            {j.description
              ? <div className="whitespace-pre-wrap text-sm leading-relaxed">{j.description}</div>
              : <div className="text-sm text-muted-foreground">No description provided.</div>}
            {(j.skills?.length ?? 0) > 0 && (
              <div className="mt-6">
                <div className="text-xs uppercase text-muted-foreground mb-2">Required skills</div>
                <div className="flex flex-wrap gap-1.5">
                  {j.skills.map((s: string) => <Badge key={s} variant="outline">{s}</Badge>)}
                </div>
              </div>
            )}
            {(j.tags?.length ?? 0) > 0 && (
              <div className="mt-4">
                <div className="text-xs uppercase text-muted-foreground mb-2">Tags</div>
                <div className="flex flex-wrap gap-1.5">
                  {j.tags.map((s: string) => <Badge key={s} className="bg-primary/10 text-primary">{s}</Badge>)}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader><CardTitle className="text-base">Overview</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Meta icon={Building2} label="Company" value={j.company_name} />
            {j.company_website && (
              <Meta icon={ExternalLink} label="Website"
                value={<a className="text-primary hover:underline break-all" href={j.company_website} target="_blank" rel="noreferrer">{j.company_website}</a>} />
            )}
            <Meta icon={MapPin} label="Location" value={j.location ?? "—"} />
            <Meta icon={Briefcase} label="Employment"
              value={<span className="capitalize">{(j.employment_type ?? "—").replace(/_/g, " ")}</span>} />
            <Meta icon={Briefcase} label="Experience"
              value={<span className="capitalize">{j.experience_level ?? "—"}</span>} />
            {j.salary_text && <Meta icon={DollarSign} label="Salary" value={j.salary_text} />}
            <Meta icon={Calendar} label="Posted"
              value={posted ? formatDistanceToNow(new Date(posted), { addSuffix: true }) : "—"} />
            {j.source && <Meta icon={Briefcase} label="Source" value={<span className="capitalize">{j.source}</span>} />}
            {j.job_url && (
              <Button asChild variant="outline" className="w-full mt-2">
                <a href={j.job_url} target="_blank" rel="noreferrer">
                  Open original <ExternalLink className="h-3.5 w-3.5 ml-1" />
                </a>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Meta({ icon: Icon, label, value }: { icon: any; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5" />
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="font-medium break-words">{value}</div>
      </div>
    </div>
  );
}
