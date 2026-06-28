import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Building2, Calendar, DollarSign, Briefcase } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

const SITE = "https://talentbridge-pro-hub.lovable.app";

type JobRecord = {
  id: string;
  job_title: string;
  company_name: string;
  location: string | null;
  employment_type: string;
  experience_level: string;
  required_skills: string[];
  salary_range: string | null;
  status: string;
  posted_date: string;
  job_description: string | null;
};

const jobQuery = (jobId: string) => ({
  queryKey: ["job", jobId] as const,
  queryFn: async (): Promise<JobRecord> => {
    const { data, error } = await supabase.from("jobs").select("*").eq("id", jobId).single();
    if (error) throw error;
    return data as JobRecord;
  },
});

export const Route = createFileRoute("/_authenticated/jobs/$jobId")({
  component: JobDetail,
  loader: async ({ params, context }) => {
    try {
      return await context.queryClient.ensureQueryData(jobQuery(params.jobId));
    } catch {
      return null;
    }
  },
  head: ({ params, loaderData }) => {
    const url = `${SITE}/jobs/${params.jobId}`;
    if (!loaderData) {
      return {
        meta: [
          { title: "Job Details — TalentBridge AI" },
          { name: "robots", content: "noindex, nofollow" },
          { property: "og:url", content: url },
        ],
        links: [{ rel: "canonical", href: url }],
      };
    }
    const job = loaderData;
    const title = `${job.job_title} at ${job.company_name} — TalentBridge AI`;
    const description = (job.job_description ?? `${job.job_title} role at ${job.company_name}${job.location ? ` in ${job.location}` : ""}.`).slice(0, 158);
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: `${job.job_title} at ${job.company_name}` },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: `${job.job_title} at ${job.company_name}` },
        { name: "twitter:description", content: description },
        { name: "robots", content: "noindex, nofollow" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "JobPosting",
            title: job.job_title,
            description: job.job_description ?? `${job.job_title} role at ${job.company_name}.`,
            datePosted: job.posted_date,
            employmentType: job.employment_type.toUpperCase(),
            hiringOrganization: {
              "@type": "Organization",
              name: job.company_name,
            },
            jobLocation: job.location
              ? {
                  "@type": "Place",
                  address: { "@type": "PostalAddress", addressLocality: job.location },
                }
              : undefined,
            skills: job.required_skills,
            url,
          }),
        },
      ],
    };
  },
});

function JobDetail() {
  const { jobId } = Route.useParams();

  const { data: job, isLoading } = useQuery(jobQuery(jobId));

  const { data: cands = [] } = useQuery({
    queryKey: ["job-cands", jobId],
    queryFn: async () => {
      const { data } = await supabase.from("candidates").select("id, candidate_name, status, email, created_at").eq("linked_job_id", jobId).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  if (isLoading) return <div className="p-10 text-muted-foreground">Loading…</div>;
  if (!job) return <div className="p-10">Job not found.</div>;

  return (
    <div className="p-6 lg:p-10 max-w-5xl">
      <Link to="/jobs" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-base">
        <ArrowLeft className="h-4 w-4" /> Back to jobs
      </Link>

      <div className="glass rounded-2xl p-8 mt-6 shadow-card">
        <Badge className="bg-primary/10 text-primary border-0 capitalize">{job.status}</Badge>
        <h1 className="mt-3 text-3xl font-bold">{job.job_title}</h1>
        <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1"><Building2 className="h-4 w-4" /> {job.company_name}</span>
          <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {job.location || "Remote"}</span>
          <span className="flex items-center gap-1"><Briefcase className="h-4 w-4" /> {job.employment_type.replace(/_/g, " ")}</span>
          {job.salary_range && <span className="flex items-center gap-1"><DollarSign className="h-4 w-4" /> {job.salary_range}</span>}
          <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> {new Date(job.posted_date).toLocaleDateString()}</span>
        </div>

        <div className="mt-6">
          <h2 className="font-semibold mb-2">Required Skills</h2>
          <div className="flex flex-wrap gap-2">
            {(job.required_skills as string[]).map((s) => <Badge key={s} variant="outline">{s}</Badge>)}
          </div>
        </div>

        {job.job_description && (
          <div className="mt-6">
            <h2 className="font-semibold mb-2">Description</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{job.job_description}</p>
          </div>
        )}
      </div>

      <div className="mt-6 glass rounded-2xl p-6 shadow-card">
        <h2 className="font-semibold mb-4">Candidate Submissions ({cands.length})</h2>
        {cands.length === 0 ? (
          <p className="text-sm text-muted-foreground">No submissions yet.</p>
        ) : (
          <div className="space-y-2">
            {cands.map((c) => (
              <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-card border border-border/60">
                <div>
                  <div className="font-medium">{c.candidate_name}</div>
                  <div className="text-xs text-muted-foreground">{c.email}</div>
                </div>
                <Badge variant="outline" className="capitalize">{c.status.replace("_", " ")}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
