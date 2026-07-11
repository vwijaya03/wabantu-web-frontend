"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { resumeContact } from "@/lib/resume/content";

const navItems = [
  { href: "/resume", label: "Resume" },
  { href: "/work/wabantu", label: "WABantu Work" },
];

export function PersonalNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-black/5 bg-white/80 backdrop-blur-md print:hidden">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link
          href="/resume"
          className="text-sm font-semibold tracking-tight text-neutral-900 hover:text-neutral-600"
        >
          {resumeContact.name}
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  active
                    ? "font-medium text-neutral-900"
                    : "text-neutral-500 transition-colors hover:text-neutral-900"
                }
              >
                {item.label}
              </Link>
            );
          })}
          <a
            href={resumeContact.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden text-neutral-500 transition-colors hover:text-neutral-900 sm:inline"
          >
            LinkedIn
          </a>
        </nav>
      </div>
    </header>
  );
}
