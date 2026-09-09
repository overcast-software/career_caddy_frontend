import Controller from '@ember/controller';

// The "Resources at a Glance" rows. Static reference copy, kept as data so
// the docs index can render through <ResponsiveList> (table at ≥md, cards
// below) instead of a hand-rolled two-column table.
const RESOURCES = [
  {
    id: 'career-data',
    route: 'docs.career-data',
    label: 'Career Data',
    description:
      'Your professional background in markdown — the AI reads this for everything',
  },
  {
    id: 'job-posts',
    route: 'docs.job-posts',
    label: 'Job Posts',
    description:
      'Stored job listings — the root resource everything else attaches to',
  },
  {
    id: 'job-applications',
    route: 'docs.job-applications',
    label: 'Applications',
    description:
      'Your record of applying — tracks status, dates, notes, and linked Q&A',
  },
  {
    id: 'resumes',
    route: 'docs.resumes',
    label: 'Resumes',
    description:
      'Structured resume data — importable, editable, used to supplement AI context',
  },
  {
    id: 'cover-letters',
    route: 'docs.cover-letters',
    label: 'Cover Letters',
    description:
      'AI-generated letters in your voice, tied to a specific job post',
  },
  {
    id: 'companies',
    route: 'docs.companies',
    label: 'Companies',
    description:
      'Employer profiles that group related posts, applications, and Q&A',
  },
  {
    id: 'questions',
    route: 'docs.questions',
    label: 'Questions',
    description:
      'Application questions captured from postings — AI can draft answers',
  },
  {
    id: 'answers',
    route: 'docs.answers',
    label: 'Answers',
    description:
      'Your responses — multiple drafts per question, favorites feed back to AI',
  },
  {
    id: 'scores',
    route: 'docs.scores',
    label: 'Scores',
    description:
      'AI fit score (0–100) of your profile vs. a job description with gap analysis',
  },
  {
    id: 'summaries',
    route: 'docs.summaries',
    label: 'Summaries',
    description: 'AI-generated executive summaries tailored to a specific role',
  },
  {
    id: 'scrapes',
    route: 'docs.scrapes',
    label: 'Scrapes',
    description:
      'Raw webpage captures of job listings — the input that becomes a Job Post',
  },
  {
    id: 'extension',
    route: 'docs.extension',
    label: 'Browser Extension',
    description:
      'Career Caddy Sender — install, connect, and use the one-click capture extension for Chrome and Firefox',
  },
  {
    id: 'extension-privacy',
    route: 'docs.extension-privacy',
    label: 'Extension Privacy',
    description:
      "Privacy policy for the Career Caddy Sender browser extension — what's read, when, and where it goes",
  },
];

export default class DocsIndexController extends Controller {
  resources = RESOURCES;
}
