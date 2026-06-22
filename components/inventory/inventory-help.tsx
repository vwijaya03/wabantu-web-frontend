"use client";

import Link from "next/link";
import { CircleHelp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { INVENTORY_HELP, type InventoryHelpTopic } from "@/lib/inventory/help-content";
import { cn } from "@/lib/utils";

interface InventoryHelpButtonProps {
  topic: InventoryHelpTopic;
  /** page = di samping judul halaman; inline = di samping label setting */
  variant?: "page" | "inline";
  className?: string;
}

export function InventoryHelpButton({ topic, variant = "inline", className }: InventoryHelpButtonProps) {
  const content = INVENTORY_HELP[topic];
  if (!content) return null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "shrink-0 text-muted-foreground hover:text-foreground",
            variant === "page" ? "h-8 w-8" : "h-6 w-6",
            className,
          )}
          aria-label={`Bantuan: ${content.title}`}
        >
          <CircleHelp className={variant === "page" ? "h-5 w-5" : "h-4 w-4"} />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{content.title}</DialogTitle>
          <DialogDescription>{content.what}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          {content.useCases.length > 0 ? (
            <div>
              <p className="font-medium text-foreground">Kapan dipakai</p>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-muted-foreground">
                {content.useCases.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {content.howTo && content.howTo.length > 0 ? (
            <div>
              <p className="font-medium text-foreground">Langkah singkat</p>
              <ol className="mt-1.5 list-decimal space-y-1 pl-5 text-muted-foreground">
                {content.howTo.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            </div>
          ) : null}

          {content.tips && content.tips.length > 0 ? (
            <div className="rounded-md border border-amber-200 bg-amber-50/80 px-3 py-2">
              <p className="font-medium text-amber-950">Tips</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-amber-900">
                {content.tips.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {content.relatedLinks && content.relatedLinks.length > 0 ? (
            <div className="flex flex-wrap gap-2 border-t pt-3">
              {content.relatedLinks.map((link) => (
                <Button key={link.href} variant="outline" size="sm" asChild>
                  <Link href={link.href}>{link.label}</Link>
                </Button>
              ))}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface InventoryPageHeaderProps {
  title: string;
  description?: string;
  helpTopic?: InventoryHelpTopic;
  actions?: React.ReactNode;
}

/** Page header dengan tombol (?) opsional untuk halaman modul Persediaan. */
export function InventoryPageHeader({ title, description, helpTopic, actions }: InventoryPageHeaderProps) {
  return (
    <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <div className="flex items-center gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {helpTopic ? <InventoryHelpButton topic={helpTopic} variant="page" /> : null}
        </div>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/** Judul kartu + tombol (?) untuk penjelasan fitur di dalam halaman. */
export function InventoryCardTitleWithHelp({
  title,
  helpTopic,
}: {
  title: string;
  helpTopic: InventoryHelpTopic;
}) {
  return (
    <div className="flex items-center gap-1">
      <span>{title}</span>
      <InventoryHelpButton topic={helpTopic} variant="inline" />
    </div>
  );
}
