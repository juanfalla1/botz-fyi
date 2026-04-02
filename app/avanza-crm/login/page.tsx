import Link from "next/link";

export default function AvanzaCrmLoginPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundImage:
          "linear-gradient(rgba(12,20,31,0.24), rgba(12,20,31,0.24)), url('/avanza-crm/login-bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        display: "grid",
        placeItems: "center",
        padding: 16,
      }}
    >
      <section style={{ width: "100%", maxWidth: 440, background: "#ffffff", borderRadius: 12, border: "1px solid #d8dee6", padding: 20 }}>
        <div style={{ fontWeight: 900, fontSize: 24, color: "#2f3742" }}>Avanza CRM</div>
        <div style={{ marginTop: 6, color: "#6b7280", fontSize: 14 }}>Acceso comercial privado</div>

        <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
          <input placeholder="Correo" style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #d8dee6" }} />
          <input placeholder="Contraseña" type="password" style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #d8dee6" }} />
          <Link
            href="/avanza-crm/inicio"
            style={{ textDecoration: "none", textAlign: "center", padding: "10px 12px", borderRadius: 8, background: "#22b8aa", color: "#073b37", fontWeight: 800 }}
          >
            Ingresar
          </Link>
        </div>
      </section>
    </div>
  );
}
