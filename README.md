# Remix of TalentBridge Hub

Build a modern SaaS web application called TalentBridge AI.

Purpose:
TalentBridge AI is a recruitment automation platform that connects US companies hiring for various positions with consultancy firms that provide qualified candidates. The platform centralizes job opportunities, candidate submissions, recruitment tracking, and communication workflows.

Design Requirements:

Enterprise-grade SaaS UI

Modern and professional

Smooth animations and transitions

Responsive design (desktop, tablet, mobile)

Glassmorphism and modern card layouts

Clean typography

Blue, white, and subtle gradient color palette

Dashboard-style experience similar to HubSpot, Salesforce, or modern ATS platforms

Fast and intuitive user experience

Technology Stack:

Supabase for database and authentication

n8n for automations and workflows

API-ready architecture for future integrations

Role-based access control

User Roles:

Super Admin

Consultancy Admin

Consultancy Recruiter

=================================
AUTHENTICATION

Create:

Login page

Signup page

Forgot password

Role-based access

Use Supabase Authentication.

=================================
DATABASE STRUCTURE

Jobs Table:

id

job_title

company_name

location

employment_type

required_skills

experience_level

salary_range

job_description

source

job_url

posted_date

status

created_at

Candidates Table:

id

candidate_name

email

phone

resume_url

skills

experience

linked_job_id

consultancy_id

status

notes

created_at

Consultancies Table:

id

company_name

contact_name

email

phone

subscription_plan

status

created_at

Users Table:

id

full_name

email

role

consultancy_id

=================================
DASHBOARD

Create a beautiful analytics dashboard displaying:

Cards:

Total Jobs

Active Jobs

Total Candidates

Candidates Submitted

Interviews Scheduled

Placements

Charts:

Monthly Candidate Submissions

Job Categories

Hiring Funnel

Placement Success Rate

Recent Activity Feed:

New Jobs Added

Candidates Submitted

Status Updates

=================================
JOB MANAGEMENT

Jobs Page:

Search jobs

Filter by skills

Filter by location

Filter by employment type

Filter by company

Sort by date

Job Details Page:

Full job description

Required skills

Candidate submissions

Status tracking

Create:

Add Job

Edit Job

Delete Job

=================================
CONSULTANCY PORTAL

Consultancy users can:

View available jobs

Search jobs

Submit candidates

Upload resumes

Track candidate progress

View placement history

Create a dedicated consultancy dashboard.

=================================
CANDIDATE MANAGEMENT

Candidate Profiles:

Resume upload

Skills

Experience

Linked jobs

Status timeline

Statuses:

Submitted

Screening

Interview

Offer

Hired

Rejected

Create Kanban view and table view.

=================================
AUTOMATION CENTER

Create a page called Automation Center.

Display automation workflows:

Job Discovery Workflow
Job Sources
→ n8n
→ Supabase
→ Dashboard

Candidate Submission Workflow
Candidate Submission
→ Notification
→ Database Update

Interview Workflow
Interview Scheduled
→ Email Notification
→ Status Update

Use visual workflow diagrams.

=================================
NOTIFICATIONS

Notification Center:

New Job Available

Candidate Submitted

Interview Scheduled

Offer Released

Candidate Hired

Display notification badges.

=================================
SEARCH

Global Search Bar:

Search across:

Jobs

Candidates

Companies

Consultancies

Provide instant results.

=================================
REPORTS

Reports Page:

Generate:

Job Reports

Candidate Reports

Placement Reports

Consultancy Performance Reports

Allow export:

PDF

Excel

CSV

=================================
FUTURE AI FEATURES SECTION

Create a section showing upcoming features:

AI Resume Matching

Candidate Ranking

Automated Screening

Job Recommendation Engine

AI Analytics Dashboard

Display these as premium future modules.

=================================
SETTINGS

Settings Page:

Profile Management

Company Settings

User Management

Role Permissions

Notification Preferences

=================================
LANDING PAGE

Create a premium landing page with:

Hero Section:
"Connecting US Hiring Demand with Qualified Talent"

Features Section:

Automated Job Discovery

Recruitment Workflow Automation

Candidate Management

Real-Time Tracking

Architecture Diagram Section:
Job Sources
→ n8n Automation
→ Supabase Database
→ TalentBridge AI Platform
→ Consultancy Portal

Pricing Section:
Starter
Professional
Enterprise

Contact Section:
Request Demo Form

=================================
UI QUALITY

Make the application look like a modern SaaS product capable of being sold to recruitment agencies and consultancy firms.

Prioritize:

Professional aesthetics

Smooth transitions

Enterprise-grade UX

Scalable architecture

Clean dashboards

Interactive charts

Beautiful data tables

Generate all pages, navigation, database connections, role-based flows, and Supabase integration structure.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://talentbridge-hiring-exchange.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/419f765e-dc95-4183-aa50-d5b6d8468cd0).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
