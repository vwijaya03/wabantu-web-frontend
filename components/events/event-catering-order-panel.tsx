"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { eventsApi, type EventRow } from "@/lib/api/events";
import { eventDetailKey } from "@/lib/query/events-query-keys";
import { useLocale } from "@/lib/i18n/locale";
import { useEventDateFormat } from "@/components/events/events-i18n";

type Props = {
  eventId: string;
  event: EventRow;
  tenantKey: string;
  disabled?: boolean;
};

function buildCateringMessage(
  itemName: string,
  eventDate: string,
  orderNotes: string,
  quantity: string,
  size: string,
  formatEventDateIdWithWeekday: (value: string | null | undefined) => string,
): string {
  const dateLabel = formatEventDateIdWithWeekday(eventDate);
  const lines = [`Pesan ${itemName.trim()} untuk ${dateLabel}`];
  const notes = orderNotes.trim();
  if (notes) lines.push(notes);
  const qty = quantity.trim();
  const sz = size.trim();
  if (qty || sz) {
    const detail = [qty, sz].filter(Boolean).join(", ukuran ");
    lines.push(detail);
  }
  return lines.join("\n");
}

export function EventCateringOrderPanel(props: Props) {
  return (
    <EventCateringOrderPanelInner
      key={`${props.eventId}:${props.event.cateringOrderNotes ?? ""}`}
      {...props}
    />
  );
}

function EventCateringOrderPanelInner({ eventId, event, tenantKey, disabled }: Props) {
  const { t } = useLocale();
  const { formatEventDateIdWithWeekday } = useEventDateFormat();
  const qc = useQueryClient();
  const [itemName, setItemName] = useState("wedang pokak");
  const [quantity, setQuantity] = useState("2 Botol");
  const [size, setSize] = useState("1,5 Liter");
  const [orderNotes, setOrderNotes] = useState("tanpa gula semua ya");
  const [savedMessage, setSavedMessage] = useState(event.cateringOrderNotes ?? "");

  const saveMut = useMutation({
    mutationFn: (cateringOrderNotes: string) =>
      eventsApi.updateEvent(eventId, {
        eventName: event.eventName,
        eventDescription: event.eventDescription,
        location: event.location,
        startDate: event.startDate,
        endDate: event.endDate,
        startTime: event.startTime,
        endTime: event.endTime,
        status: event.status,
        breakStartTime: event.breakStartTime,
        breakEndTime: event.breakEndTime,
        cateringOrderNotes,
      }),
    onSuccess: () => {
      toast.success(t("Pesanan Catering disimpan"));
      void qc.invalidateQueries({ queryKey: eventDetailKey(tenantKey, eventId) });
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e?.response?.data?.message ?? t("Gagal menyimpan pesan")),
  });

  const handleGenerate = () => {
    const msg = buildCateringMessage(
      itemName,
      event.startDate,
      orderNotes,
      quantity,
      size,
      formatEventDateIdWithWeekday,
    );
    setSavedMessage(msg);
  };

  const handleCopy = async () => {
    const text = savedMessage.trim();
    if (!text) {
      toast.error(t("Buat atau isi pesan dulu"));
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("Pesan disalin"));
    } catch {
      toast.error(t("Gagal menyalin ke clipboard"));
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t("Pesanan Catering")}</CardTitle>
        <CardDescription>
          {t(
            "Buat teks pesan untuk vendor (mis. wedang pokak), simpan per acara, dan salin ke WhatsApp. Pesan tersimpan terpisah dari Catatan acara — bisa dilihat/diubah di Edit acara → Pesanan Catering.",
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>{t("Nama pesanan")}</Label>
            <Input
              value={itemName}
              disabled={disabled}
              onChange={(e) => setItemName(e.target.value)}
            />
          </div>
          <div>
            <Label>{t("Tanggal acara")}</Label>
            <Input value={formatEventDateIdWithWeekday(event.startDate)} readOnly disabled />
          </div>
          <div>
            <Label>{t("Jumlah")}</Label>
            <Input
              value={quantity}
              disabled={disabled}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="2 Botol"
            />
          </div>
          <div>
            <Label>{t("Ukuran")}</Label>
            <Input
              value={size}
              disabled={disabled}
              onChange={(e) => setSize(e.target.value)}
              placeholder="1,5 Liter"
            />
          </div>
        </div>
        <div>
          <Label>{t("Catatan pesanan")}</Label>
          <Textarea
            rows={2}
            disabled={disabled}
            value={orderNotes}
            onChange={(e) => setOrderNotes(e.target.value)}
            placeholder="tanpa gula semua ya"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" disabled={disabled} onClick={handleGenerate}>
            {t("Buat pesan")}
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => void handleCopy()}>
            <Copy className="mr-1 h-3 w-3" /> {t("Salin pesan")}
          </Button>
          {!disabled ? (
            <Button
              type="button"
              size="sm"
              disabled={saveMut.isPending || !savedMessage.trim()}
              onClick={() => saveMut.mutate(savedMessage.trim())}
            >
              {t("Simpan")}
            </Button>
          ) : null}
        </div>
        <div>
          <Label>{t("Pratinjau / pesan tersimpan")}</Label>
          <Textarea
            rows={5}
            disabled={disabled}
            value={savedMessage}
            onChange={(e) => setSavedMessage(e.target.value)}
            placeholder={t("Klik Buat pesan atau ketik manual...")}
          />
        </div>
      </CardContent>
    </Card>
  );
}
