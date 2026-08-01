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
import { formatEventDateIdWithWeekday } from "@/lib/events-format";
import { eventDetailKey } from "@/lib/query/events-query-keys";

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
      toast.success("Pesan catering disimpan");
      void qc.invalidateQueries({ queryKey: eventDetailKey(tenantKey, eventId) });
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e?.response?.data?.message ?? "Gagal menyimpan pesan"),
  });

  const handleGenerate = () => {
    const msg = buildCateringMessage(itemName, event.startDate, orderNotes, quantity, size);
    setSavedMessage(msg);
  };

  const handleCopy = async () => {
    const text = savedMessage.trim();
    if (!text) {
      toast.error("Buat atau isi pesan dulu");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Pesan disalin");
    } catch {
      toast.error("Gagal menyalin ke clipboard");
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Pesan catering</CardTitle>
        <CardDescription>
          Buat teks pesan untuk vendor (mis. wedang pokak), simpan per acara, dan salin ke WhatsApp. Pesan
          tersimpan terpisah dari Catatan acara — bisa dilihat/diubah di Edit acara → Pesan catering.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Nama pesanan</Label>
            <Input
              value={itemName}
              disabled={disabled}
              onChange={(e) => setItemName(e.target.value)}
            />
          </div>
          <div>
            <Label>Tanggal acara</Label>
            <Input value={formatEventDateIdWithWeekday(event.startDate)} readOnly disabled />
          </div>
          <div>
            <Label>Jumlah</Label>
            <Input
              value={quantity}
              disabled={disabled}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="2 Botol"
            />
          </div>
          <div>
            <Label>Ukuran</Label>
            <Input
              value={size}
              disabled={disabled}
              onChange={(e) => setSize(e.target.value)}
              placeholder="1,5 Liter"
            />
          </div>
        </div>
        <div>
          <Label>Catatan pesanan</Label>
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
            Buat pesan
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => void handleCopy()}>
            <Copy className="mr-1 h-3 w-3" /> Salin pesan
          </Button>
          {!disabled ? (
            <Button
              type="button"
              size="sm"
              disabled={saveMut.isPending || !savedMessage.trim()}
              onClick={() => saveMut.mutate(savedMessage.trim())}
            >
              Simpan
            </Button>
          ) : null}
        </div>
        <div>
          <Label>Pratinjau / pesan tersimpan</Label>
          <Textarea
            rows={5}
            disabled={disabled}
            value={savedMessage}
            onChange={(e) => setSavedMessage(e.target.value)}
            placeholder="Klik Buat pesan atau ketik manual..."
          />
        </div>
      </CardContent>
    </Card>
  );
}
