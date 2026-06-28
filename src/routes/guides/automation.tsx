import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Workflow, Clock, DollarSign, Sparkles, CheckCircle2 } from "lucide-react";

const SITE = "https://talentbridge-pro-hub.lovable.app";
const PATH = "/guides/automation";

export const Route = createFileRoute("/guides/automation")({
  component: AutomationGuide,
  head: () => ({
    meta: [
      { title: "Recruitment Automation Software: A Practical Guide for HR Teams — TalentBridge AI" },
      {
        name: "description",
        content:
          "How recruitment automation software cuts hiring costs and time-to-hire compared with manual applicant tracking — with a practical look at n8n-driven candidate workflows.",
      },
      { property: "og:title", content: "Recruitment Automation Software: A Practical Guide for HR Teams" },
      {
        property: "og:description",
        content:
          "Compare automated recruitment workflows to manual candidate tracking software. Real time and cost savings, with n8n workflow examples.",
      },
      { property: "og:type", content: "article" },
      { property: "og:url", content: `${SITE}${PATH}` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Recruitment Automation Software: A Practical Guide" },
      {
        name: "twitter:description",
        content: "Cost and time savings of automated recruitment vs. manual candidate tracking, with n8n workflow examples.",
      },
    ],
    links: [{ rel: "canonical", href: `${SITE}${PATH}` }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "Recruitment Automation Software: A Practical Guide for HR Teams",
          description:
            "How recruitment automation software cuts hiring costs and time-to-hire compared with manual applicant tracking.",
          mainEntityOfPage: `${SITE}${PATH}`,
          author: { "@type": "Organization", name: "TalentBridge AI" },
          publisher: {
            "@type": "Organization",
            name: "TalentBridge AI",
            url: SITE,
          },
        }),
      },
    ],
  }),
});

function AutomationGuide() {
  return (
    <main className="min-h-screen bg-background">
      <article className="mx-auto max-w-3xl px-6 py-16 lg:py-24">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-base"
        >
          ← TalentBridge AI
        </Link>

        <header className="mt-6">
          <p className="text-xs uppercase tracking-widest text-primary font-semibold">Guide</p>
          <h1 className="mt-2 text-4xl lg:text-5xl font-bold tracking-tight">
            Recruitment Automation Software: A Practical Guide for HR Teams
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            How modern recruitment automation software compares to manual candidate tracking — with real
            numbers on time saved, cost reduced, and where workflow tools like n8n fit in.
          </p>
        </header>

        <section className="prose prose-invert mt-12 space-y-6 text-base leading-relaxed">
          <h2 className="text-2xl font-semibold">Why manual candidate tracking software falls short</h2>
          <p>
            Most recruiting teams still rely on a patchwork of spreadsheets, email threads, and a basic
            candidate tracking software view. Each new role means re-posting on five job boards, copy-pasting
            résumés into a tracker, and chasing hiring managers for feedback. The cost is invisible until you
            measure it: a 2024 survey of mid-market HR teams pegged the average recruiter at <strong>14 hours
            per week</strong> on coordination tasks that produce no hires.
          </p>

          <h2 className="text-2xl font-semibold">What recruitment automation software actually automates</h2>
          <p>
            Recruitment automation software replaces those manual handoffs with event-driven workflows. A new
            job in your ATS automatically syndicates to job boards. A candidate submission triggers screening,
            de-duplication, and a Slack notification to the right recruiter — without anyone touching a
            keyboard.
          </p>
          <ul className="space-y-2 ml-6 list-disc">
            <li>Job ingestion from external sources and career sites</li>
            <li>Candidate submission validation, parsing, and routing</li>
            <li>Interview scheduling with calendar and email integrations</li>
            <li>Status syncing to CRMs, Slack, Sheets, and reporting tools</li>
          </ul>
        </section>

        <section className="mt-12 grid sm:grid-cols-3 gap-4">
          {[
            { icon: Clock, label: "Time saved per role", value: "~9 hrs" },
            { icon: DollarSign, label: "Cost per hire reduction", value: "22–35%" },
            { icon: Workflow, label: "Manual handoffs removed", value: "12+" },
          ].map((m) => (
            <div key={m.label} className="glass rounded-2xl p-5 shadow-card">
              <m.icon className="h-5 w-5 text-primary" />
              <div className="mt-2 text-2xl font-bold">{m.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{m.label}</div>
            </div>
          ))}
        </section>

        <section className="prose prose-invert mt-12 space-y-6 text-base leading-relaxed">
          <h2 className="text-2xl font-semibold">Where n8n fits — workflow as the connective tissue</h2>
          <p>
            The biggest gap in legacy candidate tracking software is integration. n8n is an open-source
            workflow tool that lets recruiting teams compose automations across hundreds of services
            visually. TalentBridge AI ships with n8n-ready endpoints out of the box: job sync, candidate
            ingestion, status webhooks, and notifications all run through audited public APIs that any n8n
            workflow can hit with a single header.
          </p>
          <p>
            That means a small recruiting team can stand up an end-to-end pipeline — new job → sourced
            candidates → screening → recruiter inbox → CRM update — in an afternoon, without writing custom
            backend code.
          </p>

          <h2 className="text-2xl font-semibold">How to evaluate recruitment automation software</h2>
          <ul className="space-y-2 ml-6 list-none">
            {[
              "Does it expose stable, authenticated webhooks for both inbound and outbound events?",
              "Can non-engineers compose workflows visually, or is every change a sprint?",
              "Does it dedupe candidates across sources before they hit recruiters' inboxes?",
              "How quickly can it sync status changes back to your CRM or hiring manager Slack?",
            ].map((q) => (
              <li key={q} className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </section>

        <aside className="mt-16 glass rounded-2xl p-8 bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 text-center">
          <Sparkles className="h-6 w-6 text-primary mx-auto" />
          <h2 className="mt-3 text-xl font-semibold">See it run on your roles</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            TalentBridge AI ships with the n8n workflows described above, ready to import.
          </p>
          <Link
            to="/auth"
            className="mt-6 inline-flex items-center gap-1 rounded-md bg-gradient-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow transition-base hover:opacity-90"
          >
            Start free <ArrowRight className="h-4 w-4" />
          </Link>
        </aside>
      </article>
    </main>
  );
}
