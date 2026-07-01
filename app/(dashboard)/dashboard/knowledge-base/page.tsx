"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/page-header";
import { QueryListState } from "@/components/dashboard/query-list-state";
import { toApiError } from "@/lib/api/client";
import { knowledgeBaseApi } from "@/lib/api/knowledge-base";

const KB_KEY = ["kb-list"] as const;

export default function KnowledgeBasePage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [draft, setDraft] = useState({
    question: "",
    answer: "",
    category: "",
  });

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: [...KB_KEY, activeSearch],
    queryFn: () => knowledgeBaseApi.list({ search: activeSearch }),
  });
  const items = data?.items ?? [];

  const createMut = useMutation({
    mutationFn: knowledgeBaseApi.create,
    onSuccess: () => {
      setDraft({ question: "", answer: "", category: "" });
      toast.success("FAQ ditambahkan");
      void qc.invalidateQueries({ queryKey: KB_KEY });
    },
    onError: (err) => toast.error(toApiError(err).message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => knowledgeBaseApi.remove(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KB_KEY });
    },
    onError: (err) => toast.error(toApiError(err).message),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.question.trim() || !draft.answer.trim()) {
      toast.error("Pertanyaan dan jawaban wajib diisi");
      return;
    }
    createMut.mutate({
      question: draft.question.trim(),
      answer: draft.answer.trim(),
      category: draft.category.trim() || undefined,
    });
  };

  return (
    <>
      <PageHeader
        title="Knowledge Base"
        description="Daftar FAQ yang dipakai AI untuk menjawab pelanggan."
      />

      <Card className="mb-6 border-amber-500/30 bg-amber-500/5">
        <CardContent className="p-5 text-sm">
          <p className="font-medium">Verifikasi bukti transfer (AI)</p>
          <p className="mt-1 text-muted-foreground">
            Agar bukti transfer bisa diverifikasi AI secara otomatis, tambahkan FAQ berisi nomor
            rekening dan atas nama penerima pembayaran (kategori mis. &quot;payment&quot; atau
            &quot;rekening&quot;).
          </p>
          <Button asChild variant="link" className="mt-2 h-auto p-0">
            <Link href="/dashboard/ai-settings">Atur mode verifikasi di AI Settings</Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="mb-6 border-primary/30 bg-primary/5">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="font-medium">Baru di WABantu?</p>
            <p className="text-sm text-muted-foreground">
              Lewat chat singkat dengan AI, profil toko dan draft FAQ kebijakan bisa disusun otomatis —
              Anda review dulu sebelum publish.
            </p>
          </div>
          <Button asChild className="shrink-0">
            <Link href="/dashboard/knowledge-base/setup">Mulai setup dengan AI</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" />
            Tambah FAQ baru
          </CardTitle>
          <CardDescription>
            Tulis pertanyaan & jawaban yang sering ditanyakan pelanggan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="kb-q">Pertanyaan</Label>
                <Input
                  id="kb-q"
                  value={draft.question}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, question: e.target.value }))
                  }
                  placeholder="Berapa harga paket family?"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="kb-cat">Kategori (opsional)</Label>
                <Input
                  id="kb-cat"
                  value={draft.category}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, category: e.target.value }))
                  }
                  placeholder="harga / pengiriman / produk"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kb-a">Jawaban</Label>
              <Textarea
                id="kb-a"
                rows={3}
                value={draft.answer}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, answer: e.target.value }))
                }
                placeholder="Paket family Rp 95.000 untuk 4 orang, sudah termasuk minum."
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={createMut.isPending}>
                {createMut.isPending ? "Menyimpan..." : "Tambah FAQ"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Daftar FAQ</CardTitle>
            <CardDescription>{items.length} entri</CardDescription>
          </div>
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              if (e.target.value === "") setActiveSearch("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") setActiveSearch(search);
            }}
            placeholder="Cari pertanyaan..."
            className="max-w-xs"
          />
        </CardHeader>
        <CardContent>
          <QueryListState
            isLoading={isLoading}
            isError={isError}
            error={error}
            isEmpty={items.length === 0}
            onRetry={() => void refetch()}
            empty={
              <p className="py-8 text-center text-sm text-muted-foreground">
                Belum ada FAQ. Mulai dengan pertanyaan yang paling sering datang.
              </p>
            }
          >
            <ul className="space-y-3">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start justify-between gap-4 rounded-lg border bg-card p-4"
                >
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium leading-tight">
                        {item.question}
                      </p>
                      {item.category && (
                        <Badge variant="secondary" className="text-[10px]">
                          {item.category}
                        </Badge>
                      )}
                      {!item.isActive && (
                        <Badge variant="outline" className="text-[10px]">
                          nonaktif
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {item.answer}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMut.mutate(item.id)}
                    aria-label="Hapus"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          </QueryListState>
        </CardContent>
      </Card>
    </>
  );
}
