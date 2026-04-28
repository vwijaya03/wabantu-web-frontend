"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/page-header";

export default function TeamPage() {
  const { user } = useAuth();

  return (
    <>
      <PageHeader
        title="Team Settings"
        description="Kelola anggota tim yang punya akses dashboard."
        actions={<Button disabled>Undang anggota (segera)</Button>}
      />

      <Card>
        <CardHeader>
          <CardTitle>Anggota tim</CardTitle>
          <CardDescription>
            Owner punya akses penuh. Staff bisa balas chat & edit FAQ.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {user && (
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>
                    {(user.name || user.email).charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">
                    {user.name || user.email}
                  </p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <Badge variant={user.role === "owner" ? "default" : "secondary"}>
                {user.role}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
