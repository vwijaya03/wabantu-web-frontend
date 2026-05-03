import Link from "next/link";
import { redirect } from "next/navigation";
import { WabantuLogo } from "@/components/brand/wabantu-logo";
import { AuthProvider } from "@/components/providers/auth-provider";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { Topbar } from "@/components/dashboard/topbar";
import { getServerUser } from "@/lib/api/server";

// Dashboard reads auth cookies + per-tenant data on every request — never
// safe to prerender. Marking the subtree dynamic also stops the build
// from trying to generate client components without an active session.
export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getServerUser();
  if (!user) redirect("/login?next=/dashboard");

  return (
    <AuthProvider initialUser={user}>
      <div className="grid min-h-svh grid-cols-1 lg:grid-cols-[260px_1fr]">
        <aside className="hidden border-r bg-sidebar text-sidebar-foreground lg:flex lg:flex-col">
          <div className="flex h-16 items-center gap-2 border-b px-6">
            <Link href="/dashboard" className="flex items-center gap-2">
              <WabantuLogo />
            </Link>
          </div>
          <div className="flex-1 overflow-y-auto">
            <SidebarNav />
          </div>
        </aside>
        <div className="flex min-w-0 flex-col">
          <Topbar />
          <main className="flex-1 overflow-y-auto bg-muted/20 p-6 lg:p-8">
            <div className="mx-auto max-w-6xl space-y-6">{children}</div>
          </main>
        </div>
      </div>
    </AuthProvider>
  );
}
