"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/app/supabaseClient";
import { AlertCircle, CheckCircle, Loader2, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";

interface InviteData {
  id: string;
  email: string;
  role: string;
  access_level: string;
  status: string;
}

export default function AcceptInvitePage({ params }: { params: Promise<{ inviteId: string }> }) {
  const router = useRouter();
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"verify" | "setup" | "success">("verify");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [inviteId, setInviteId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const resolvedParams = await params;
        if (!isMounted) return;
        
        const id = resolvedParams.inviteId;
        setInviteId(id);
        await verifyInvite(id);
      } catch (err) {
        if (isMounted) {
          console.error("Error in useEffect:", err);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [params]);

  const verifyInvite = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      console.log("🔍 DEBUG: Validating inviteId:", id);

      // Use API endpoint to validate invite (bypasses RLS)
      const res = await fetch(`/api/platform/admin-invites/validate?inviteId=${encodeURIComponent(id)}`);
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Invitación no encontrada");
      }

      const { invite: inviteData } = await res.json();
      
      console.log("🔍 DEBUG: Invite validated:", inviteData);

      setInvite(inviteData);
      setStep("setup");
    } catch (err) {
      console.error("Error verifying invite:", err);
      setError(err instanceof Error ? err.message : "Error al verificar la invitación");
      setStep("verify");
    } finally {
      setLoading(false);
    }
  };

  const validatePassword = (): boolean => {
    setPasswordError(null);

    if (!password || !confirmPassword) {
      setPasswordError("Por favor completa ambos campos");
      return false;
    }

    if (password.length < 8) {
      setPasswordError("La contraseña debe tener al menos 8 caracteres");
      return false;
    }

    if (!/[A-Z]/.test(password)) {
      setPasswordError("La contraseña debe contener al menos una mayúscula");
      return false;
    }

    if (!/[0-9]/.test(password)) {
      setPasswordError("La contraseña debe contener al menos un número");
      return false;
    }

    if (password !== confirmPassword) {
      setPasswordError("Las contraseñas no coinciden");
      return false;
    }

    return true;
  };

  const handleSetupPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePassword() || !invite) return;

    try {
      setSubmitting(true);
      setPasswordError(null);

      // Create user with password
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invite.email,
        password,
        options: {
          data: {
            role: invite.role,
            access_level: invite.access_level,
          },
        },
      });

      if (authError) {
        throw new Error(authError.message);
      }

      if (!authData.user) {
        throw new Error("Error al crear la cuenta");
      }

      // ✅ NUEVO: Crear tenant demo con trial de 2 días
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 2);
      
      const { data: newTenant, error: tenantError } = await supabase
        .from("tenants")
        .insert({
          empresa: invite.email.split("@")[0],
          email: invite.email,
          status: "trial",
          trial_start: new Date().toISOString(),
          trial_end: trialEndDate.toISOString(),
          auth_user_id: authData.user.id,
        })
        .select()
        .single();

      if (tenantError) {
        console.warn("Error creating tenant:", tenantError);
        throw new Error("No se pudo crear el tenant de prueba");
      }

      console.log("✅ Tenant creado:", newTenant.id);

      // ✅ NUEVO: Crear team_member con rol 'admin' en el tenant demo
      const { data: teamMember, error: teamError } = await supabase
        .from("team_members")
        .insert({
          tenant_id: newTenant.id,
          email: invite.email,
          nombre: invite.email.split("@")[0],
          rol: "admin",
          activo: true,
          auth_user_id: authData.user.id,
          permissions: { all: true },
        })
        .select()
        .single();

      if (teamError) {
        console.warn("Error creating team_member:", teamError);
        throw new Error("No se pudo crear el team member");
      }

      console.log("✅ Team member creado:", teamMember?.id);

      // ✅ NUEVO: Crear subscription con status 'trialing'
      const { data: subscription, error: subError } = await supabase
        .from("subscriptions")
        .insert({
          user_id: authData.user.id,
          tenant_id: newTenant.id,
          plan: "Básico",
          status: "trialing",
          trial_start: newTenant.trial_start,
          trial_end: newTenant.trial_end,
        })
        .select()
        .single();

      if (subError) {
        console.warn("Error creating subscription:", subError);
      }

      console.log("✅ Subscription creada:", subscription?.id);

      // ✅ NUEVO: Guardar tenant_id en auth metadata (CRÍTICO para que el usuario pueda entrar)
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          tenant_id: newTenant.id,
          role: invite.role,
          is_trial: true,
          trial_end: trialEndDate.toISOString(),
        },
      });

      if (updateError) {
        console.warn("Error updating user metadata:", updateError);
      }

      console.log("✅ Auth metadata actualizado con tenant_id");

      // Add user to platform_admins so they have system access
      const { error: adminError } = await supabase
        .from("platform_admins")
        .insert({
          auth_user_id: authData.user.id,
        })
        .select()
        .single();

      if (adminError) {
        console.warn("Error adding to platform_admins:", adminError);
      }

      // Update invite status to accepted
      const { error: inviteError } = await supabase
        .from("admin_invites")
        .update({ status: "accepted" })
        .eq("id", invite.id);

      if (inviteError) {
        console.warn("Error updating invite status:", inviteError);
      }

      setStep("success");
    } catch (err) {
      console.error("Error setting up password:", err);
      setPasswordError(err instanceof Error ? err.message : "Error al crear la cuenta");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ background: "linear-gradient(135deg, #0c1929 0%, #0f2444 50%, #001a33 100%)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <Loader2 style={{ width: "32px", height: "32px", color: "#0096ff", margin: "0 auto 16px", animation: "spin 1s linear infinite" }} />
          <p style={{ color: "#7dd3fc", fontSize: "16px" }}>Verificando invitación...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "linear-gradient(135deg, #0c1929 0%, #0f2444 50%, #001a33 100%)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ maxWidth: "500px", width: "100%", background: "rgba(0, 150, 255, 0.05)", border: "1px solid rgba(0, 150, 255, 0.2)", borderRadius: "12px", padding: "40px", boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ background: "linear-gradient(135deg, #0096ff 0%, #0077cc 100%)", width: "56px", height: "56px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <span style={{ fontSize: "28px" }}>🔐</span>
          </div>
          <h1 style={{ fontSize: "28px", fontWeight: "bold", color: "white", margin: "0 0 8px 0" }}>
            {step === "success" ? "¡Bienvenido!" : "Aceptar Invitación"}
          </h1>
          <p style={{ color: "#7dd3fc", margin: 0 }}>
            {step === "success" 
              ? "Tu cuenta ha sido creada exitosamente"
              : "Completa tu registro en Botz Platform"}
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div style={{ marginBottom: "24px", padding: "16px", borderRadius: "8px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", display: "flex", alignItems: "flex-start", gap: "12px" }}>
            <AlertCircle style={{ width: "20px", height: "20px", color: "#ef4444", flexShrink: 0, marginTop: "2px" }} />
            <div>
              <p style={{ color: "#fca5a5", margin: 0, fontWeight: "600" }}>Error</p>
              <p style={{ color: "#fca5a5", margin: "4px 0 0 0", fontSize: "14px" }}>{error}</p>
            </div>
          </div>
        )}

        {/* Success message */}
        {step === "success" && (
          <div style={{ marginBottom: "24px" }}>
            <div style={{ marginBottom: "24px", padding: "16px", borderRadius: "8px", background: "rgba(34, 197, 94, 0.1)", border: "1px solid rgba(34, 197, 94, 0.3)", display: "flex", alignItems: "flex-start", gap: "12px" }}>
              <CheckCircle style={{ width: "20px", height: "20px", color: "#22c55e", flexShrink: 0, marginTop: "2px" }} />
              <div>
                <p style={{ color: "#86efac", margin: 0, fontWeight: "600" }}>¡Éxito!</p>
                <p style={{ color: "#86efac", margin: "4px 0 0 0", fontSize: "14px" }}>Tu cuenta ha sido creada y está lista para usar</p>
              </div>
            </div>

            <div style={{ marginBottom: "24px", padding: "16px", borderRadius: "8px", background: "rgba(0, 150, 255, 0.08)", border: "1px solid rgba(0, 150, 255, 0.2)" }}>
              <p style={{ color: "#7dd3fc", margin: "0 0 8px 0", fontWeight: "600" }}>Detalles de tu cuenta:</p>
              <p style={{ color: "#b0d4ff", margin: "4px 0", fontSize: "14px" }}>
                <strong>Email:</strong> {invite?.email}
              </p>
              <p style={{ color: "#b0d4ff", margin: "4px 0", fontSize: "14px" }}>
                <strong>Rol:</strong> {invite?.role}
              </p>
              <p style={{ color: "#b0d4ff", margin: "4px 0", fontSize: "14px" }}>
                <strong>Acceso:</strong> {invite?.access_level}
              </p>
            </div>

            <button
              onClick={() => router.push("/start")}
              style={{
                width: "100%",
                padding: "12px",
                background: "linear-gradient(135deg, #0096ff 0%, #0077cc 100%)",
                border: "none",
                color: "white",
                borderRadius: "8px",
                fontWeight: "600",
                cursor: "pointer",
                fontSize: "16px"
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
              onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
            >
              Ir al Inicio
            </button>
          </div>
        )}

        {/* Setup password form */}
        {step === "setup" && invite && (
          <form onSubmit={handleSetupPassword} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ padding: "16px", borderRadius: "8px", background: "rgba(0, 150, 255, 0.08)", border: "1px solid rgba(0, 150, 255, 0.2)" }}>
              <p style={{ color: "#7dd3fc", margin: "0 0 8px 0", fontWeight: "600" }}>Información de Invitación:</p>
              <p style={{ color: "#b0d4ff", margin: "4px 0", fontSize: "14px" }}>
                <strong>Email:</strong> {invite.email}
              </p>
              <p style={{ color: "#b0d4ff", margin: "4px 0", fontSize: "14px" }}>
                <strong>Rol:</strong> {invite.role}
              </p>
              <p style={{ color: "#b0d4ff", margin: "4px 0", fontSize: "14px" }}>
                <strong>Nivel de Acceso:</strong> {invite.access_level}
              </p>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "14px", fontWeight: "500", color: "#7dd3fc", marginBottom: "8px" }}>
                Contraseña *
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 40px 10px 12px",
                    borderRadius: "8px",
                    background: "rgba(15, 23, 42, 0.5)",
                    border: "1px solid rgba(0, 150, 255, 0.3)",
                    color: "white",
                    fontSize: "14px",
                    boxSizing: "border-box"
                  }}
                  placeholder="Mínimo 8 caracteres, 1 mayúscula, 1 número"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "#7dd3fc",
                    cursor: "pointer",
                    padding: 0
                  }}
                >
                  {showPassword ? (
                    <EyeOff style={{ width: "16px", height: "16px" }} />
                  ) : (
                    <Eye style={{ width: "16px", height: "16px" }} />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "14px", fontWeight: "500", color: "#7dd3fc", marginBottom: "8px" }}>
                Confirmar Contraseña *
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 40px 10px 12px",
                    borderRadius: "8px",
                    background: "rgba(15, 23, 42, 0.5)",
                    border: "1px solid rgba(0, 150, 255, 0.3)",
                    color: "white",
                    fontSize: "14px",
                    boxSizing: "border-box"
                  }}
                  placeholder="Repite tu contraseña"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "#7dd3fc",
                    cursor: "pointer",
                    padding: 0
                  }}
                >
                  {showConfirmPassword ? (
                    <EyeOff style={{ width: "16px", height: "16px" }} />
                  ) : (
                    <Eye style={{ width: "16px", height: "16px" }} />
                  )}
                </button>
              </div>
            </div>

            {passwordError && (
              <div style={{ padding: "12px", borderRadius: "8px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", display: "flex", alignItems: "flex-start", gap: "8px" }}>
                <AlertCircle style={{ width: "16px", height: "16px", color: "#ef4444", flexShrink: 0, marginTop: "2px" }} />
                <p style={{ color: "#fca5a5", margin: 0, fontSize: "13px" }}>{passwordError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              style={{
                width: "100%",
                padding: "12px",
                background: submitting ? "rgba(0, 150, 255, 0.5)" : "linear-gradient(135deg, #0096ff 0%, #0077cc 100%)",
                border: "none",
                color: "white",
                borderRadius: "8px",
                fontWeight: "600",
                cursor: submitting ? "not-allowed" : "pointer",
                fontSize: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px"
              }}
              onMouseEnter={(e) => !submitting && (e.currentTarget.style.opacity = "0.9")}
              onMouseLeave={(e) => !submitting && (e.currentTarget.style.opacity = "1")}
            >
              {submitting && <Loader2 style={{ width: "16px", height: "16px", animation: "spin 1s linear infinite" }} />}
              {submitting ? "Creando cuenta..." : "Crear Cuenta"}
            </button>
          </form>
        )}

        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}
