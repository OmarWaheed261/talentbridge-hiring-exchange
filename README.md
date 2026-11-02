# TalentBridge AI 🚀
### Automated Recruitment & Candidate Matching Platform

TalentBridge AI is an AI-powered recruitment management platform designed to connect companies with recruitment consultancies. It automates job discovery, organizes hiring opportunities, and simplifies the process of matching suitable candidates with open positions.

The platform brings job aggregation, candidate management, recruitment workflows, and AI-powered matching into one centralized dashboard.

---

## 🎯 Project Objective

The goal of TalentBridge AI is to reduce manual recruitment work by automating job collection and helping recruitment consultancies discover relevant opportunities, submit qualified candidates, and track hiring progress efficiently.

## ✨ Key Features

- **Automated Job Discovery:** Collect job postings from multiple sources using Apify.
- **Job Search & Filtering:** Search jobs by title, company, location, skills, experience, employment type, and custom tags.
- **Candidate Management:** Store and manage candidate profiles, resumes, skills, and experience.
- **AI-Powered Matching:** Identify suitable candidates based on job requirements and candidate skills.
- **Recruitment Pipeline:** Track candidate progress through Submitted, Screening, Interview, Hired, and Rejected stages.
- **Consultancy Dashboard:** Allow recruitment consultancies to view opportunities and manage candidate submissions.
- **Admin Dashboard:** Manage users, jobs, consultancies, and platform activity.
- **Saved Jobs & Searches:** Bookmark opportunities and save frequently used search filters.
- **Automation Monitoring:** Monitor job imports, automation runs, and synchronization activity.
- **Real-Time Updates:** Keep recruitment data updated through Supabase Realtime.

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| Next.js | Frontend and application framework |
| TypeScript | Type-safe development |
| Tailwind CSS | UI styling |
| Supabase | Database, authentication, storage, and realtime |
| PostgreSQL | Relational database |
| Apify | Job data collection and web scraping |
| n8n | Workflow automation and integrations |
| AI API (Gemini/OpenAI) | Candidate matching and job analysis |
| Vercel | Application deployment |

## 🔄 How It Works

1. **Job Collection:** Apify collects job postings from supported job sources and company career pages.
2. **Workflow Automation:** n8n processes the collected data, standardizes job details, and handles duplicate prevention.
3. **Database Storage:** Cleaned job information is stored in Supabase.
4. **Job Discovery:** The platform displays available opportunities with search and filtering options.
5. **Candidate Submission:** Recruitment consultancies identify relevant candidates and submit their profiles.
6. **AI Matching:** AI analyzes candidate skills and experience against job requirements.
7. **Hiring Tracking:** Recruiters track applications and update candidate statuses through the recruitment pipeline.

## 🏗️ System Architecture

```text
       Job Sources
            |
            v
       Apify Actors
            |
            v
       n8n Workflows
            |
     Data Processing
     & Deduplication
            |
            v
       Supabase
     (PostgreSQL DB)
            |
            v
     TalentBridge AI
       Dashboard
            |
      +-----+------+
      |            |
      v            v
  Job Search   Candidate
  & Discovery  Management
      |            |
      +-----+------+
            |
            v
      AI Matching
            |
            v
     Hiring Pipeline
```

## 📂 Main Modules

- **Dashboard:** Overview of jobs, candidates, submissions, and recruitment activity.
- **Job Management:** Discover, search, filter, and manage job opportunities.
- **Candidate Management:** Maintain candidate profiles and resume information.
- **AI Matching Engine:** Compare job requirements with candidate profiles.
- **Consultancy Portal:** Manage recruitment activities and candidate submissions.
- **Admin Panel:** Manage platform users, permissions, and data.
- **Automation Center:** Monitor data collection and workflow execution.

## 🔐 Security

- Supabase Authentication for user access.
- Role-Based Access Control (RBAC).
- Row Level Security (RLS) for database access.
- Secure resume storage.
- API keys and service credentials stored in server-side environment variables.

## 🚀 Future Enhancements

- Advanced AI-based candidate ranking.
- Automated resume parsing and skill extraction.
- Email and WhatsApp notifications.
- Integration with additional job platforms and company career portals.
- Recruitment analytics and performance reports.
- Automated candidate recommendations.
- Advanced semantic job search.

## 💡 Project Vision

TalentBridge AI aims to make recruitment more connected, efficient, and data-driven by combining job discovery, workflow automation, candidate management, and artificial intelligence in a single platform.

---

**Project:** TalentBridge AI  
**Category:** AI / Full-Stack Web Development / Recruitment Automation  
**Status:** In Development

*Built to simplify recruitment through automation and intelligent candidate matching.*

