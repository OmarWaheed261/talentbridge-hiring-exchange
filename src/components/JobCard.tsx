import { Link } from "@tanstack/react-router";
import { Bookmark, BookmarkCheck, ExternalLink, MapPin, Building2, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";

export interface CollectedJobLike {
  id: string;
  job_title: string;
  company_name: string;
  location?: string | null;
  skills?: string[] | null;
  tags?: string[] | null;
  source?: string | null;
  status?: string | null;
  posted_date?: string | null;
  created_at?: string | null;
  employment_type?: string | null;
  experience_level?: string | null;
  salary_text?: string | null;
  job_url?: string | null;
}

export function JobCard({
  job,
  bookmarked,
  onToggleBookmark,
}: {
  job: CollectedJobLike;
  bookmarked?: boolean;
  onToggleBookmark?: (id: string) => void;
}) {
  const posted = job.posted_date || job.created_at;
  return (
    <Card className="group hover:shadow-md transition-all border-border/60 hover:border-primary/40">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              to="/job-search/$jobId"
              params={{ jobId: job.id }}
              className="font-semibold text-base leading-snug hover:text-primary line-clamp-2 block"
            >
              {job.job_title}
            </Link>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{job.company_name}</span>
              {job.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{job.location}</span>}
              {posted && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDistanceToNow(new Date(posted), { addSuffix: true })}
                </span>
              )}
            </div>
          </div>
          {onToggleBookmark && (
            <Button
              size="icon"
              variant="ghost"
              aria-label={bookmarked ? "Remove bookmark" : "Bookmark job"}
              onClick={(e) => {
                e.preventDefault();
                onToggleBookmark(job.id);
              }}
            >
              {bookmarked ? <BookmarkCheck className="h-4 w-4 text-primary" /> : <Bookmark className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {job.employment_type && <Badge variant="secondary" className="capitalize">{job.employment_type.replace(/_/g, " ")}</Badge>}
          {job.experience_level && <Badge variant="secondary" className="capitalize">{job.experience_level}</Badge>}
          {job.salary_text && <Badge variant="outline">{job.salary_text}</Badge>}
          {job.source && <Badge variant="outline" className="capitalize">{job.source}</Badge>}
        </div>
        {(job.skills?.length ?? 0) > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {job.skills!.slice(0, 8).map((s) => (
              <Badge key={s} variant="outline" className="text-xs font-normal">{s}</Badge>
            ))}
            {(job.skills!.length ?? 0) > 8 && (
              <span className="text-xs text-muted-foreground">+{job.skills!.length - 8}</span>
            )}
          </div>
        )}
        {(job.tags?.length ?? 0) > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {job.tags!.map((t) => (
              <Badge key={t} className="bg-primary/10 text-primary hover:bg-primary/15 text-xs font-normal">{t}</Badge>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 pt-1">
          <Button asChild size="sm" variant="default">
            <Link to="/job-search/$jobId" params={{ jobId: job.id }}>View details</Link>
          </Button>
          {job.job_url && (
            <Button asChild size="sm" variant="outline">
              <a href={job.job_url} target="_blank" rel="noreferrer">
                Original <ExternalLink className="h-3.5 w-3.5 ml-1" />
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
