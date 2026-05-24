"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/page-header";
import { useAuth } from "@/components/providers/auth-provider";
import { hasTenantDashboardAccess } from "@/lib/api/auth";

type Props = {
  title: string;
  description?: string;
  children: React.ReactNode;
};

/** Blocks tenant-scoped pages until super_admin impersonates a tenant. */
export function RequireTenantDashboard({ title, description, children }: Props) {
  const { user } = useAuth();

  if (user?.role === "super_admin" && !hasTenantDashboardAccess(user)) {
    return (
      <>
        <PageHeader
          title={title}
          description={
            description ??
            "Fitur ini milik tenant klien. Pilih tenant dengan tombol Pantau di konsol platform."
          }
        />
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base">Pantau tenant dulu</CardTitle>
            <CardDescription>
              Sebagai operator internal, buka{" "}
              <strong>Konsol Platform</strong>, lalu klik{" "}
              <strong>Pantau</strong> pada tenant yang ingin Anda kelola. Setelah
              itu menu Workflow, Cabang, Inbox, dan lainnya akan tersedia.
            </CardDescription>
          </CardHeader>
          <div className="px-6 pb-6">
            <Button asChild>
              <Link href="/dashboard/admin">Ke Konsol Platform</Link>
            </Button>
          </div>
        </Card>
      </>
    );
  }

  return <>{children}</>;
}
