import { toApiError } from "@/lib/api/errors";

/** Safe user-facing copy for public event pages — never surface raw API/DB messages. */
export function publicEventErrorCopy(error: unknown): { title: string; message: string } {
  const status = toApiError(error).status;
  if (status === 404) {
    return {
      title: "Acara tidak ditemukan",
      message: "Acara tidak ditemukan",
    };
  }
  if (status === 503) {
    return {
      title: "Sementara tidak tersedia",
      message: "Jadwal sementara tidak tersedia. Coba muat ulang sebentar lagi.",
    };
  }
  return {
    title: "Tidak tersedia",
    message: "Terjadi gangguan. Coba lagi nanti.",
  };
}
