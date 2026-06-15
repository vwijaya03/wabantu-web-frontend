"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { WabantuLogo } from "@/components/brand/wabantu-logo";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function MobileSidebarSheet() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="shrink-0" aria-label="Buka menu navigasi">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="flex w-[min(100vw,280px)] flex-col gap-0 border-r bg-sidebar p-0 text-sidebar-foreground [&>button]:text-sidebar-foreground"
      >
        <SheetTitle className="sr-only">Menu navigasi</SheetTitle>
        <div className="flex h-16 shrink-0 items-center border-b border-sidebar-border px-4">
          <Link href="/dashboard" onClick={() => setOpen(false)} className="flex items-center gap-2">
            <WabantuLogo />
          </Link>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <SidebarNav onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
