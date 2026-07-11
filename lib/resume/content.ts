export type ResumeBullet = string;

export type ResumeRole = {
  company: string;
  title: string;
  location?: string;
  start: string;
  end: string;
  bullets: ResumeBullet[];
};

export type ResumeSkillGroup = {
  label: string;
  items: string[];
};

export type ResumeCertification = {
  name: string;
  detail?: string;
  url?: string;
};

export const resumeContact = {
  name: "Viko Wijaya",
  title: "Mid Full Stack Developer · Applied AI Engineer",
  email: "viko_wijaya@yahoo.co.id",
  phone: "+62 812 9206 6606",
  linkedin: "https://www.linkedin.com/in/vikowijaya",
  linkedinLabel: "linkedin.com/in/vikowijaya",
  location: "South Jakarta, Indonesia",
};

export const resumeContactLines = [
  `Email: ${resumeContact.email}`,
  `Phone: ${resumeContact.phone}`,
  `LinkedIn: ${resumeContact.linkedin}`,
  `Location: ${resumeContact.location}`,
];

export const resumeSummary = [
  "Full-stack developer with 6 years of experience building high-scale, multi-tenant SaaS platforms where data correctness and query performance are equally critical.",
  "At Jubelio, delivered PostgreSQL lifecycle tooling and warehouse query optimizations used in production by 3,000+ e-commerce sellers, including a 12,000-line archiving system that reduced active database size by 60% to 80% per tenant with zero data integrity incidents.",
  "Built WABantu, a solo WhatsApp commerce platform with production LLM integration, guided order flow, and payment proof verification.",
];

export const resumeSkillGroups: ResumeSkillGroup[] = [
  {
    label: "Backend and APIs",
    items: ["Go", "Node.js", "TypeScript", "Hapi.js", "REST APIs"],
  },
  {
    label: "Database and Performance",
    items: ["PostgreSQL", "PL/pgSQL", "Multi-tenant SaaS"],
  },
  {
    label: "Infrastructure and Messaging",
    items: ["Redis", "RabbitMQ", "Git", "Docker"],
  },
  {
    label: "Applied AI",
    items: ["Applied AI Engineer"],
  },
  {
    label: "Languages",
    items: ["English (Professional)", "Indonesian (Fluent)"],
  },
];

export const resumeExperience: ResumeRole[] = [
  {
    company: "Jubelio",
    title: "Mid Full Stack Developer",
    location: "South Jakarta, Indonesia",
    start: "May 2020",
    end: "Present",
    bullets: [
      "Designed and built Archiving V2, an enterprise data lifecycle platform for a multi-tenant PostgreSQL SaaS ERP serving 3,000+ e-commerce businesses.",
      "Authored a 30-step orchestrated archiving function (12,000 lines of PL/pgSQL) spanning 50+ interconnected tables across sales, purchasing, warehouse, accounting, settlement, and fulfillment.",
      "Engineered a schema preservation system that snapshots and restores indexes, constraints, triggers, views, and partitions so archived data can be restored without breaking application behavior.",
      "Deployed a multi-dimensional validation system comparing warehouse quantities and accounting balances between production and backup databases, achieving zero data corruption across all production runs.",
      "Reduced active database size by 60% to 80% per tenant, accelerating query response times and lowering infrastructure cost for high-volume sellers.",
      "Led a core warehouse SQL redesign for On-Going Occupied Reserved Stock, cutting execution time from 4.8 seconds to 70 milliseconds, a 98% improvement.",
      "Replaced legacy quantity validation logic with an optimized implementation used across warehouse services, reducing latency from 1.4-1.6 seconds to 268-307 milliseconds for all bins.",
      "Eliminated production timeout failures on large-scale item chronology queries, bringing execution to a reliable 4-10 second range for audit and reporting workloads.",
      "Migrated the platform from single-location quantity limits to multi-warehouse allocation architecture across warehouse and catalog services.",
      "Launched Archiving V1 in PostgreSQL, improving application responsiveness for high-volume clients by up to 60%.",
      "Delivered cancelled-order handling in quantity chronology with Node.js (Hapi.js and TypeScript), enabling accurate warehouse adjustments at scale.",
      "Created a custom Redis rate limiter that reduced marketplace API errors and prevented integration bans during peak sync windows.",
      "Introduced Shopee reserved-quantity bundle splitting and RabbitMQ queue isolation to stabilize high-load marketplace synchronization processes.",
      "Increased marketplace sync throughput by 30% through bulk operations and stronger error traceability.",
    ],
  },
  {
    company: "Ayo Tani",
    title: "Full Stack Developer",
    location: "Surabaya, Indonesia",
    start: "October 2019",
    end: "April 2020",
    bullets: [
      "Delivered an agriculture investment platform in 4 months across Android (Kotlin), Laravel web, and Go backend services with PostgreSQL.",
    ],
  },
  {
    company: "IT Provent",
    title: "Backend Developer",
    location: "Surabaya, Indonesia",
    start: "October 2016",
    end: "September 2019",
    bullets: [
      "Integrated Bank Mandiri APIs for a financial technology Android app serving Unilever retailers and distributors.",
      "Built PPOB payment features and optimized CSV import pipelines for invoice datasets up to 50 million rows.",
    ],
  },
  {
    company: "PT. Arius Angkasa Indonesia",
    title: "Full Stack Developer",
    location: "Indonesia",
    start: "February 2016",
    end: "August 2016",
    bullets: [
      "Developed a member rewards and MLM system in Laravel 5 with MySQL for partner merchant transactions in 6 months.",
    ],
  },
  {
    company: "PT Sarana Multi Infrastruktur (Persero)",
    title: "Backend Developer",
    location: "Surabaya, Indonesia",
    start: "December 2015",
    end: "January 2016",
    bullets: [
      "Automated SQL Server data migration into a monitoring database using stored procedures and Laravel integration during a 2-month contract.",
    ],
  },
  {
    company: "MyMe Tala International",
    title: "Intern",
    location: "Surabaya, Indonesia",
    start: "June 2015",
    end: "September 2015",
    bullets: [
      "Produced a field sales web application and API in Laravel 4 with Android client integration during a 3-month internship.",
    ],
  },
];

export const resumeEducation = {
  school: "Universitas Ciputra Surabaya",
  degree: "Bachelor of Science, Computer Science",
  years: "2012 - 2016",
};

export const resumeCertifications: ResumeCertification[] = [
  {
    name: "Cert Prep: CompTIA Security+ Exam (SY0-501): The Basics",
  },
  {
    name: "Associate AI Engineer for Developers",
    detail: "DataCamp",
    url: "https://www.datacamp.com/completed/statement-of-accomplishment/track/b45a852ea9556118da97f40a84ca630e25de35b4",
  },
];

export const resumeIndependentWork = {
  title: "WABantu",
  period: "2025 - Present",
  description:
    "Solo-built WhatsApp commerce platform spanning 10+ Encore backend services and 40+ automated tests. Designed system flows with rigorous manual QA across order flow, payment proof, and catalog routing.",
  href: "/work/wabantu",
  portfolioUrl: "https://wabantu-web-frontend.vercel.app/work/wabantu",
};
