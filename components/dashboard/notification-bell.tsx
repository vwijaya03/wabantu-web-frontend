"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { notificationsApi } from "@/lib/api/notifications";
import { toApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

const NOTIFICATIONS_QUERY_KEY = ["notifications"];

export function NotificationBell() {
  const router = useRouter();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: () => notificationsApi.list(),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const markReadMut = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    },
    onError: (e) => {
      console.warn("mark notification read failed", toApiError(e).message);
    },
  });

  const unreadCount = data?.unreadCount ?? 0;
  const notifications = data?.notifications ?? [];

  const handleOpen = (id: string, linkPath?: string) => {
    markReadMut.mutate(id);
    if (linkPath) {
      router.push(linkPath);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notifikasi" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 ? (
            <span
              className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground"
              aria-label={`${unreadCount} notifikasi belum dibaca`}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
        <DropdownMenuLabel>Notifikasi</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            Belum ada notifikasi.
          </p>
        ) : (
          notifications.map((n) => (
            <DropdownMenuItem
              key={n.id}
              className={cn(
                "flex cursor-pointer flex-col items-start gap-0.5 py-2",
                !n.readAt && "bg-muted/50",
              )}
              onClick={() => handleOpen(n.id, n.linkPath)}
            >
              <span className="text-sm font-medium leading-snug">{n.title}</span>
              <span className="text-xs text-muted-foreground line-clamp-2">{n.body}</span>
              <span className="text-[10px] text-muted-foreground">
                {new Date(n.createdAt).toLocaleString("id-ID")}
              </span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
