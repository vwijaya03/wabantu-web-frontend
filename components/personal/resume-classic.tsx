import Link from "next/link";

import {
  resumeCertifications,
  resumeContact,
  resumeEducation,
  resumeExperience,
  resumeIndependentWork,
  resumeSkillGroups,
  resumeSummary,
} from "@/lib/resume/content";

export function ResumeClassic() {
  return (
    <main className="resume-classic mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="resume-header mb-6 border-b border-neutral-300 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
          {resumeContact.name}
        </h1>
        <p className="mt-1 text-sm font-medium text-neutral-700">{resumeContact.title}</p>
      </header>

      <section className="resume-section mb-6">
        <h2 className="resume-section-title mb-2 text-sm font-bold uppercase tracking-wide text-neutral-900">
          CONTACT
        </h2>
        <ul className="resume-contact-list space-y-1 text-sm text-neutral-800">
          <li>
            <span className="resume-contact-label">Email: </span>
            <a href={`mailto:${resumeContact.email}`} className="resume-contact-value underline">
              {resumeContact.email}
            </a>
          </li>
          <li>
            <span className="resume-contact-label">Phone: </span>
            <span className="resume-contact-value">{resumeContact.phone}</span>
          </li>
          <li>
            <span className="resume-contact-label">LinkedIn: </span>
            <a
              href={resumeContact.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="resume-contact-value underline"
            >
              {resumeContact.linkedin}
            </a>
          </li>
          <li>
            <span className="resume-contact-label">Location: </span>
            <span className="resume-contact-value">{resumeContact.location}</span>
          </li>
        </ul>
      </section>

      <section className="resume-section mb-6">
        <h2 className="resume-section-title mb-2 text-sm font-bold uppercase tracking-wide text-neutral-900">
          SUMMARY
        </h2>
        <div className="space-y-2 text-sm leading-relaxed text-neutral-800">
          {resumeSummary.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </section>

      <section className="resume-section mb-6">
        <h2 className="resume-section-title mb-2 text-sm font-bold uppercase tracking-wide text-neutral-900">
          SKILLS
        </h2>
        <ul className="space-y-1 text-sm text-neutral-800">
          {resumeSkillGroups.map((group) => (
            <li key={group.label}>
              <span className="font-semibold">{group.label}:</span> {group.items.join(", ")}
            </li>
          ))}
        </ul>
      </section>

      <section className="resume-section mb-6">
        <h2 className="resume-section-title mb-3 text-sm font-bold uppercase tracking-wide text-neutral-900">
          EXPERIENCE
        </h2>
        <div className="space-y-5">
          {resumeExperience.map((role) => (
            <article key={`${role.company}-${role.start}-${role.title}`}>
              <div className="mb-1">
                <h3 className="text-sm font-bold text-neutral-900">
                  {role.title} | {role.company}
                </h3>
                <p className="text-sm text-neutral-700">
                  {role.start} - {role.end}
                  {role.location ? `, ${role.location}` : ""}
                </p>
              </div>
              <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-neutral-800">
                {role.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="resume-section mb-6">
        <h2 className="resume-section-title mb-2 text-sm font-bold uppercase tracking-wide text-neutral-900">
          INDEPENDENT WORK
        </h2>
        <p className="text-sm leading-relaxed text-neutral-800">
          <span className="font-semibold">{resumeIndependentWork.title}</span> (
          {resumeIndependentWork.period}). {resumeIndependentWork.description}{" "}
          <Link href={resumeIndependentWork.href} className="underline">
            Case study: {resumeIndependentWork.portfolioUrl}
          </Link>
        </p>
      </section>

      <section className="resume-section mb-6">
        <h2 className="resume-section-title mb-2 text-sm font-bold uppercase tracking-wide text-neutral-900">
          EDUCATION
        </h2>
        <p className="text-sm text-neutral-800">
          <span className="font-semibold">{resumeEducation.school}</span>
          <br />
          {resumeEducation.degree}
          <br />
          {resumeEducation.years}
        </p>
      </section>

      <section className="resume-section">
        <h2 className="resume-section-title mb-2 text-sm font-bold uppercase tracking-wide text-neutral-900">
          CERTIFICATIONS
        </h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-800">
          {resumeCertifications.map((cert) => (
            <li key={cert.name}>
              {cert.url ? (
                <a href={cert.url} target="_blank" rel="noopener noreferrer" className="underline">
                  {cert.name}
                </a>
              ) : (
                cert.name
              )}
              {cert.detail ? ` - ${cert.detail}` : ""}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
