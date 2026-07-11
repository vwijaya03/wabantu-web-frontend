import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";

import {
  resumeCertifications,
  resumeContact,
  resumeContactLines,
  resumeEducation,
  resumeExperience,
  resumeIndependentWork,
  resumeSkillGroups,
  resumeSummary,
} from "@/lib/resume/content";

function heading(text: string) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120 },
  });
}

function body(text: string) {
  return new Paragraph({
    children: [new TextRun(text)],
    spacing: { after: 120 },
  });
}

function bullet(text: string) {
  return new Paragraph({
    text,
    bullet: { level: 0 },
    spacing: { after: 60 },
  });
}

export async function buildResumeDocx(): Promise<Buffer> {
  const children: Paragraph[] = [
    new Paragraph({
      children: [new TextRun({ text: resumeContact.name, bold: true, size: 32 })],
      spacing: { after: 80 },
    }),
    body(resumeContact.title),
    heading("CONTACT"),
    ...resumeContactLines.map((line) => body(line)),
    heading("SUMMARY"),
    ...resumeSummary.map((p) => body(p)),
    heading("SKILLS"),
    ...resumeSkillGroups.map((group) => body(`${group.label}: ${group.items.join(", ")}`)),
    heading("EXPERIENCE"),
  ];

  for (const role of resumeExperience) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${role.title} | ${role.company}`, bold: true }),
        ],
        spacing: { before: 160, after: 40 },
      }),
      body(`${role.start} - ${role.end}${role.location ? `, ${role.location}` : ""}`),
      ...role.bullets.map((b) => bullet(b)),
    );
  }

  children.push(
    heading("INDEPENDENT WORK"),
    body(
      `${resumeIndependentWork.title} (${resumeIndependentWork.period}) - ${resumeIndependentWork.description} Case study: ${resumeIndependentWork.portfolioUrl}`,
    ),
    heading("EDUCATION"),
    body(resumeEducation.school),
    body(resumeEducation.degree),
    body(resumeEducation.years),
    heading("CERTIFICATIONS"),
    ...resumeCertifications.map((cert) =>
      body(`${cert.name}${cert.detail ? ` - ${cert.detail}` : ""}`),
    ),
  );

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
    styles: {
      default: {
        document: {
          run: {
            font: "Calibri",
            size: 22,
          },
          paragraph: {
            alignment: AlignmentType.LEFT,
          },
        },
      },
    },
  });

  return Packer.toBuffer(doc);
}
