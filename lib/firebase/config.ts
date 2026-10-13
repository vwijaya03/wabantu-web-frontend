/**
 * Konfigurasi Firebase web (publik, bukan secret). Firebase hanya diinisialisasi
 * jika keempat NEXT_PUBLIC_FIREBASE_* terisi; kalau tidak, UI memakai polling.
 * Akses harus literal process.env.X agar di-inline Next.js saat build.
 */
export const firebaseWebConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
};

export function isFirebaseConfigured(): boolean {
  return Object.values(firebaseWebConfig).every((v) => v.trim() !== "");
}
