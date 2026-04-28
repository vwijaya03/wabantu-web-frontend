"use client";

/**
 * Standalone fallback rendered when an error escapes the root layout.
 * Must define its own <html>/<body> because it replaces RootLayout.
 * Keep dependency surface small — no providers, no context.
 */
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="id">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
          background: "#fafafa",
          color: "#0a0a0a",
        }}
      >
        <main
          style={{
            maxWidth: 480,
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: 8 }}>
            Terjadi kesalahan
          </h1>
          <p style={{ color: "#525252", marginBottom: 24 }}>
            Aplikasi tidak bisa menampilkan halaman ini. Coba muat ulang.
          </p>
          {error.digest && (
            <p
              style={{
                fontSize: 12,
                color: "#737373",
                marginBottom: 24,
                fontFamily: "ui-monospace, monospace",
              }}
            >
              ref: {error.digest}
            </p>
          )}
          <button
            onClick={() => unstable_retry()}
            style={{
              padding: "0.6rem 1.2rem",
              borderRadius: 8,
              background: "#16a34a",
              color: "white",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Coba lagi
          </button>
        </main>
      </body>
    </html>
  );
}
