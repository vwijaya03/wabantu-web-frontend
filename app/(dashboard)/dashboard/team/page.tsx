"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/dashboard/page-header";
import { teamApi } from "@/lib/api/team";
import { toApiError } from "@/lib/api/client";
import { toast } from "sonner";

export default function TeamPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["team-members"],
    queryFn: () => teamApi.list(),
    enabled: user?.role === "owner",
  });

  const inviteMut = useMutation({
    mutationFn: () => teamApi.invite({ email, password, name }),
    onSuccess: () => {
      toast.success("Staff berhasil diundang");
      setEmail("");
      setName("");
      setPassword("");
      void qc.invalidateQueries({ queryKey: ["team-members"] });
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => teamApi.remove(id),
    onSuccess: () => {
      toast.success("Staff dihapus");
      void qc.invalidateQueries({ queryKey: ["team-members"] });
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  if (user?.role !== "owner") {
    return (
      <PageHeader
        title="Team Settings"
        description="Hanya owner yang dapat mengelola tim."
      />
    );
  }

  return (
    <>
      <PageHeader
        title="Team Settings"
        description="Kelola anggota tim yang punya akses dashboard."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Undang staff</CardTitle>
            <CardDescription>
              Staff dapat membalas chat dan mengelola FAQ.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label="Email" id="email" value={email} onChange={setEmail} type="email" />
            <Field label="Nama" id="name" value={name} onChange={setName} />
            <Field label="Password" id="password" value={password} onChange={setPassword} type="password" />
            <Button
              onClick={() => inviteMut.mutate()}
              disabled={inviteMut.isPending || !email || password.length < 8}
            >
              Undang anggota
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Anggota tim</CardTitle>
            <CardDescription>
              {isLoading ? "Memuat..." : `${data?.total ?? 0} anggota`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(data?.members ?? []).map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>
                      {(m.name || m.email).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{m.name || m.email}</p>
                    <p className="text-xs text-muted-foreground">{m.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={m.role === "owner" ? "default" : "secondary"}>
                    {m.role}
                  </Badge>
                  {m.role === "staff" && m.id !== user?.id ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeMut.mutate(m.id)}
                      disabled={removeMut.isPending}
                    >
                      Hapus
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Field(props: {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={props.id}>{props.label}</Label>
      <Input
        id={props.id}
        type={props.type ?? "text"}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
      />
    </div>
  );
}
