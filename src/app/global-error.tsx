"use client";

import React, { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[global] erro crítico na aplicação", error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "1.5rem",
          fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
          background: "#020617",
          color: "#f8fafc",
          textAlign: "center"
        }}
      >
        <div style={{ maxWidth: 440 }}>
          <h1 style={{ margin: "0 0 0.5rem", fontSize: "1.5rem", fontWeight: 800 }}>Algo deu errado</h1>
          <p style={{ margin: "0 0 1.25rem", color: "#cbd5e1", fontSize: "0.875rem" }}>
            Ocorreu um erro inesperado na aplicação. Tente novamente.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              border: "none",
              borderRadius: 999,
              padding: "0.62rem 1rem",
              fontWeight: 700,
              cursor: "pointer",
              background: "#60a5fa",
              color: "#0f172a"
            }}
          >
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  );
}
