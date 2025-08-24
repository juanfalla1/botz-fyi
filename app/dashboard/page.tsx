"use client";
import Dashboard from "./Dashboard";

export default function Page() {
  return (
    <div style={{ background: "var(--botz-bg)", minHeight: "100vh" }}>
      {/* Contenedor centrado */}
      <main
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "32px 20px",
        }}
      >
        <Dashboard />
      </main>
    </div>
  );
}

