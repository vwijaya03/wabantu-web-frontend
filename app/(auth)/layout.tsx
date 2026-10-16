import Link from "next/link";
import { AuthMarketing } from "@/components/auth/auth-marketing";
import { WabantuLogo } from "@/components/brand/wabantu-logo";
import { LocaleSwitch } from "@/components/i18n/locale-switch";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-semibold"
          >
            <WabantuLogo textClassName="text-base" />
          </Link>
          <LocaleSwitch />
        </div>
        <div className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>
      <div className="relative hidden overflow-hidden bg-primary/5 lg:block">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,oklch(0.7_0.16_158/30%),transparent_60%)]"
        />
        <AuthMarketing />
      </div>
    </div>
  );
}
