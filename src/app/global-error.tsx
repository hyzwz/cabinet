"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "#0b1020",
        color: "#f3f4f6",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "560px",
          borderRadius: "16px",
          padding: "24px",
          background: "rgba(15, 23, 42, 0.92)",
          border: "1px solid rgba(148, 163, 184, 0.2)",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.35)",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "12px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#94a3b8",
          }}
        >
          Global Error
        </p>
        <h1 style={{ margin: "12px 0 8px", fontSize: "28px", lineHeight: 1.2 }}>
          Something went wrong
        </h1>
        <p style={{ margin: 0, color: "#cbd5e1", lineHeight: 1.6 }}>
          The application hit an unexpected error while rendering this page.
        </p>
        {error.digest ? (
          <p style={{ margin: "12px 0 0", fontSize: "13px", color: "#94a3b8" }}>
            Error digest: {error.digest}
          </p>
        ) : null}
        <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              border: 0,
              borderRadius: "10px",
              padding: "10px 16px",
              background: "#e2e8f0",
              color: "#0f172a",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => window.location.assign("/")}
            style={{
              borderRadius: "10px",
              padding: "10px 16px",
              background: "transparent",
              color: "#e2e8f0",
              border: "1px solid rgba(148, 163, 184, 0.35)",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Go home
          </button>
        </div>
      </section>
    </div>
  );
}
