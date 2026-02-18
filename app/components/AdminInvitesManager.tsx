"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/app/supabaseClient";
import { 
  Mail, Plus, Trash2, Edit2, CheckCircle, Clock, XCircle, 
  AlertCircle, Loader2, Shield, User, Lock, X
} from "lucide-react";

interface AdminInvite {
  id: string;
  email: string;
  role: string;
  status: string;
  access_level: string;
  created_at: string;
  expires_at?: string;
  notes?: string;
}

export default function AdminInvitesManager() {
  const [invites, setInvites] = useState<AdminInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ show: boolean; id: string; email: string }>({ show: false, id: "", email: "" });
  const [formData, setFormData] = useState({
    email: "",
    role: "developer",
    access_level: "full",
    notes: "",
  });

  useEffect(() => {
    fetchInvites();
  }, []);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const fetchInvites = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from("admin_invites")
        .select("*")
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;
      setInvites(data || []);
    } catch (error) {
      console.error("Error fetching invites:", error);
      setError("No se pudieron cargar las invitaciones. Verifica que tengas permisos de administrador.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      if (editingId) {
        const { error: updateError } = await supabase
          .from("admin_invites")
          .update({
            role: formData.role,
            access_level: formData.access_level,
            notes: formData.notes,
          })
          .eq("id", editingId);

        if (updateError) throw updateError;
        setSuccess("Invitación actualizada correctamente");
        setEditingId(null);
      } else {
        const { error: insertError } = await supabase
          .from("admin_invites")
          .insert({
            email: formData.email,
            role: formData.role,
            access_level: formData.access_level,
            notes: formData.notes,
            created_by: user.id,
          });

        if (insertError) {
          if (insertError.code === "23505") {
            throw new Error("Este email ya tiene una invitación");
          }
          throw insertError;
        }
        setSuccess("Invitación creada correctamente");
      }

      setFormData({
        email: "",
        role: "developer",
        access_level: "full",
        notes: "",
      });
      setShowForm(false);
      await fetchInvites();
    } catch (error) {
      console.error("Error saving invite:", error);
      setError(error instanceof Error ? error.message : "Error al guardar la invitación");
    }
  };

  const handleDeleteClick = (id: string, email: string) => {
    setShowDeleteConfirm({ show: true, id, email });
  };

  const confirmDelete = async () => {
    const { id } = showDeleteConfirm;
    setShowDeleteConfirm({ show: false, id: "", email: "" });

    try {
      setError(null);
      const { error: deleteError } = await supabase
        .from("admin_invites")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;
      setSuccess("Invitación eliminada correctamente");
      await fetchInvites();
    } catch (error) {
      console.error("Error deleting invite:", error);
      setError("Error al eliminar la invitación");
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm({ show: false, id: "", email: "" });
  };

  const handleResendEmail = async (inviteId: string, email: string) => {
    try {
      setSendingEmailId(inviteId);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No authenticated session");

      const response = await fetch("/api/platform/admin-invites/resend-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ inviteId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to resend email");
      }

      setSuccess(`Email reenviado a ${email}`);
    } catch (err) {
      console.error("Error resending email:", err);
      setError(err instanceof Error ? err.message : "Error al reenviar email");
    } finally {
      setSendingEmailId(null);
    }
  };

  const handleEdit = (invite: AdminInvite) => {
    setFormData({
      email: invite.email,
      role: invite.role,
      access_level: invite.access_level,
      notes: invite.notes || "",
    });
    setEditingId(invite.id);
    setShowForm(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: "linear-gradient(135deg, #0c1929 0%, #0f2444 50%, #001a33 100%)" }}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
          <p className="text-blue-200">Cargando invitaciones...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "linear-gradient(135deg, #0c1929 0%, #0f2444 50%, #001a33 100%)", minHeight: "100vh", padding: "40px 20px" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: "40px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
            <Shield style={{ width: "32px", height: "32px", color: "#00d4ff" }} />
            <h1 style={{ fontSize: "32px", fontWeight: "bold", color: "white", margin: 0 }}>Control de Acceso</h1>
          </div>
          <p style={{ color: "#b0d4ff", fontSize: "16px", margin: 0 }}>Gestiona invitaciones para developers, support y guests</p>
        </div>

        {/* Messages */}
        {error && (
          <div style={{ marginBottom: "24px", padding: "16px", borderRadius: "8px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", display: "flex", alignItems: "center", gap: "12px" }}>
            <AlertCircle style={{ width: "20px", height: "20px", color: "#ef4444", flexShrink: 0 }} />
            <p style={{ color: "#fca5a5", margin: 0 }}>{error}</p>
          </div>
        )}

        {success && (
          <div style={{ marginBottom: "24px", padding: "16px", borderRadius: "8px", background: "rgba(34, 197, 94, 0.1)", border: "1px solid rgba(34, 197, 94, 0.3)", display: "flex", alignItems: "center", gap: "12px" }}>
            <CheckCircle style={{ width: "20px", height: "20px", color: "#22c55e", flexShrink: 0 }} />
            <p style={{ color: "#86efac", margin: 0 }}>{success}</p>
          </div>
        )}

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "32px" }}>
          <div style={{ padding: "20px", borderRadius: "12px", background: "rgba(0, 150, 255, 0.05)", border: "1px solid rgba(0, 150, 255, 0.2)" }}>
            <p style={{ color: "#7dd3fc", fontSize: "14px", margin: "0 0 8px 0" }}>Total Invitaciones</p>
            <p style={{ fontSize: "28px", fontWeight: "bold", color: "white", margin: 0 }}>{invites.length}</p>
          </div>
          <div style={{ padding: "20px", borderRadius: "12px", background: "rgba(234, 179, 8, 0.05)", border: "1px solid rgba(234, 179, 8, 0.2)" }}>
            <p style={{ color: "#fde047", fontSize: "14px", margin: "0 0 8px 0" }}>Pendientes</p>
            <p style={{ fontSize: "28px", fontWeight: "bold", color: "#facc15", margin: 0 }}>
              {invites.filter(i => i.status === "pending").length}
            </p>
          </div>
          <div style={{ padding: "20px", borderRadius: "12px", background: "rgba(34, 197, 94, 0.05)", border: "1px solid rgba(34, 197, 94, 0.2)" }}>
            <p style={{ color: "#86efac", fontSize: "14px", margin: "0 0 8px 0" }}>Aceptadas</p>
            <p style={{ fontSize: "28px", fontWeight: "bold", color: "#22c55e", margin: 0 }}>
              {invites.filter(i => i.status === "accepted").length}
            </p>
          </div>
          <div style={{ padding: "20px", borderRadius: "12px", background: "rgba(59, 130, 246, 0.05)", border: "1px solid rgba(59, 130, 246, 0.2)" }}>
            <p style={{ color: "#93c5fd", fontSize: "14px", margin: "0 0 8px 0" }}>Developers</p>
            <p style={{ fontSize: "28px", fontWeight: "bold", color: "#3b82f6", margin: 0 }}>
              {invites.filter(i => i.role === "developer").length}
            </p>
          </div>
        </div>

        {/* Form */}
        {showForm && (
          <div style={{ marginBottom: "32px", padding: "24px", borderRadius: "12px", background: "rgba(0, 150, 255, 0.08)", border: "1px solid rgba(0, 150, 255, 0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ fontSize: "20px", fontWeight: "600", color: "white", margin: 0 }}>
                {editingId ? "Editar Invitación" : "Nueva Invitación"}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
              >
                <X style={{ width: "24px", height: "24px", color: "#7dd3fc" }} />
              </button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "14px", fontWeight: "500", color: "#7dd3fc", marginBottom: "8px" }}>
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    disabled={!!editingId}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      background: "rgba(15, 23, 42, 0.5)",
                      border: "1px solid rgba(0, 150, 255, 0.3)",
                      color: "white",
                      fontSize: "14px",
                      boxSizing: "border-box",
                      opacity: editingId ? 0.6 : 1,
                      cursor: editingId ? "not-allowed" : "text"
                    }}
                    placeholder="developer@example.com"
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "14px", fontWeight: "500", color: "#7dd3fc", marginBottom: "8px" }}>
                    Rol *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      background: "rgba(15, 23, 42, 0.5)",
                      border: "1px solid rgba(0, 150, 255, 0.3)",
                      color: "white",
                      fontSize: "14px",
                      boxSizing: "border-box"
                    }}
                  >
                    <option value="developer">👨‍💻 Developer</option>
                    <option value="support">🎧 Support</option>
                    <option value="guest">👤 Guest</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "14px", fontWeight: "500", color: "#7dd3fc", marginBottom: "8px" }}>
                    Nivel de Acceso *
                  </label>
                  <select
                    value={formData.access_level}
                    onChange={(e) => setFormData({ ...formData, access_level: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      background: "rgba(15, 23, 42, 0.5)",
                      border: "1px solid rgba(0, 150, 255, 0.3)",
                      color: "white",
                      fontSize: "14px",
                      boxSizing: "border-box"
                    }}
                  >
                    <option value="full">🔓 Acceso Completo</option>
                    <option value="readonly">👁️ Solo Lectura</option>
                    <option value="limited">🔐 Acceso Limitado</option>
                  </select>
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ display: "block", fontSize: "14px", fontWeight: "500", color: "#7dd3fc", marginBottom: "8px" }}>
                    Notas (Opcional)
                  </label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      background: "rgba(15, 23, 42, 0.5)",
                      border: "1px solid rgba(0, 150, 255, 0.3)",
                      color: "white",
                      fontSize: "14px",
                      boxSizing: "border-box"
                    }}
                    placeholder="Ej: Acceso temporal para testing"
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  type="submit"
                  style={{
                    padding: "10px 24px",
                    background: "linear-gradient(135deg, #0096ff 0%, #0077cc 100%)",
                    border: "none",
                    color: "white",
                    borderRadius: "8px",
                    fontWeight: "600",
                    cursor: "pointer",
                    fontSize: "14px"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
                >
                  {editingId ? "Actualizar" : "Crear Invitación"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                  }}
                  style={{
                    padding: "10px 24px",
                    background: "rgba(255, 255, 255, 0.1)",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    color: "#7dd3fc",
                    borderRadius: "8px",
                    fontWeight: "600",
                    cursor: "pointer",
                    fontSize: "14px"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)"}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Button to add new */}
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            style={{
              marginBottom: "32px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "12px 24px",
              background: "linear-gradient(135deg, #0096ff 0%, #0077cc 100%)",
              border: "none",
              color: "white",
              borderRadius: "8px",
              fontWeight: "600",
              cursor: "pointer",
              fontSize: "14px"
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
            onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
          >
            <Plus style={{ width: "18px", height: "18px" }} />
            Nueva Invitación
          </button>
        )}

        {/* Invites Table */}
        <div style={{ borderRadius: "12px", background: "rgba(0, 150, 255, 0.05)", border: "1px solid rgba(0, 150, 255, 0.2)", overflow: "hidden" }}>
          {invites.length === 0 ? (
            <div style={{ padding: "48px 24px", textAlign: "center" }}>
              <Mail style={{ width: "48px", height: "48px", color: "rgba(0, 150, 255, 0.4)", margin: "0 auto 12px" }} />
              <p style={{ color: "#7dd3fc", fontSize: "16px" }}>No hay invitaciones. Crea una nueva.</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", fontSize: "14px", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(0, 150, 255, 0.2)", background: "rgba(0, 150, 255, 0.08)" }}>
                    <th style={{ padding: "16px", textAlign: "left", fontWeight: "600", color: "#7dd3fc" }}>Email</th>
                    <th style={{ padding: "16px", textAlign: "left", fontWeight: "600", color: "#7dd3fc" }}>Rol</th>
                    <th style={{ padding: "16px", textAlign: "left", fontWeight: "600", color: "#7dd3fc" }}>Acceso</th>
                    <th style={{ padding: "16px", textAlign: "left", fontWeight: "600", color: "#7dd3fc" }}>Estado</th>
                    <th style={{ padding: "16px", textAlign: "left", fontWeight: "600", color: "#7dd3fc" }}>Creado</th>
                    <th style={{ padding: "16px", textAlign: "right", fontWeight: "600", color: "#7dd3fc" }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {invites.map((invite, index) => (
                    <tr
                      key={invite.id}
                      style={{
                        borderBottom: "1px solid rgba(0, 150, 255, 0.1)",
                        background: index % 2 === 0 ? "transparent" : "rgba(0, 150, 255, 0.03)"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "rgba(0, 150, 255, 0.08)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = index % 2 === 0 ? "transparent" : "rgba(0, 150, 255, 0.03)"}
                    >
                      <td style={{ padding: "16px", color: "white", display: "flex", alignItems: "center", gap: "8px" }}>
                        <User style={{ width: "16px", height: "16px", color: "#0096ff", flexShrink: 0 }} />
                        {invite.email}
                      </td>
                      <td style={{ padding: "16px", color: "#b0d4ff" }}>{invite.role}</td>
                      <td style={{ padding: "16px" }}>
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "4px 12px",
                          borderRadius: "6px",
                          background: "rgba(0, 150, 255, 0.15)",
                          border: "1px solid rgba(0, 150, 255, 0.3)",
                          color: "#7dd3fc",
                          fontSize: "12px",
                          fontWeight: "500"
                        }}>
                          <Lock style={{ width: "12px", height: "12px" }} />
                          {invite.access_level === "full" ? "Completo" : invite.access_level}
                        </span>
                      </td>
                      <td style={{ padding: "16px" }}>
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "4px 12px",
                          borderRadius: "6px",
                          background: invite.status === "pending" ? "rgba(234, 179, 8, 0.15)" : invite.status === "accepted" ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)",
                          border: invite.status === "pending" ? "1px solid rgba(234, 179, 8, 0.3)" : invite.status === "accepted" ? "1px solid rgba(34, 197, 94, 0.3)" : "1px solid rgba(239, 68, 68, 0.3)",
                          color: invite.status === "pending" ? "#fde047" : invite.status === "accepted" ? "#86efac" : "#fca5a5",
                          fontSize: "12px",
                          fontWeight: "500"
                        }}>
                          {invite.status === "pending" && <Clock style={{ width: "12px", height: "12px" }} />}
                          {invite.status === "accepted" && <CheckCircle style={{ width: "12px", height: "12px" }} />}
                          {invite.status === "rejected" && <XCircle style={{ width: "12px", height: "12px" }} />}
                          {invite.status === "pending" ? "Pendiente" : invite.status}
                        </span>
                      </td>
                      <td style={{ padding: "16px", color: "#8fd4ff", fontSize: "12px" }}>
                        {new Date(invite.created_at).toLocaleDateString("es-ES", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td style={{ padding: "16px", textAlign: "right" }}>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                          <button
                            onClick={() => handleEdit(invite)}
                            style={{
                              padding: "8px",
                              background: "none",
                              border: "none",
                              color: "#7dd3fc",
                              cursor: "pointer",
                              borderRadius: "6px"
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(0, 150, 255, 0.2)"}
                            onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                            title="Editar"
                          >
                            <Edit2 style={{ width: "16px", height: "16px" }} />
                          </button>
                          <button
                            onClick={() => handleResendEmail(invite.id, invite.email)}
                            disabled={sendingEmailId === invite.id}
                            style={{
                              padding: "8px",
                              background: "none",
                              border: "none",
                              color: sendingEmailId === invite.id ? "#666" : "#7dd3fc",
                              cursor: sendingEmailId === invite.id ? "not-allowed" : "pointer",
                              borderRadius: "6px",
                              opacity: sendingEmailId === invite.id ? 0.5 : 1
                            }}
                            onMouseEnter={(e) => sendingEmailId !== invite.id && (e.currentTarget.style.background = "rgba(34, 197, 94, 0.2)")}
                            onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                            title="Reenviar email"
                          >
                            {sendingEmailId === invite.id ? (
                              <Loader2 style={{ width: "16px", height: "16px", animation: "spin 1s linear infinite" }} />
                            ) : (
                              <Mail style={{ width: "16px", height: "16px", color: "#22c55e" }} />
                            )}
                          </button>
                          <button
                            onClick={() => handleDeleteClick(invite.id, invite.email)}
                            style={{
                              padding: "8px",
                              background: "none",
                              border: "none",
                              color: "#7dd3fc",
                              cursor: "pointer",
                              borderRadius: "6px"
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = "#ef4444"}
                            onMouseLeave={(e) => e.currentTarget.style.color = "#7dd3fc"}
                            title="Eliminar"
                          >
                            <Trash2 style={{ width: "16px", height: "16px" }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div style={{ marginTop: "24px", padding: "16px", borderRadius: "8px", background: "rgba(0, 150, 255, 0.08)", border: "1px solid rgba(0, 150, 255, 0.2)", display: "flex", alignItems: "flex-start", gap: "12px" }}>
          <Mail style={{ width: "18px", height: "18px", color: "#0096ff", marginTop: "2px", flexShrink: 0 }} />
          <p style={{ color: "#7dd3fc", fontSize: "13px", margin: 0 }}>
            <strong>ℹ️ Nota:</strong> Solo los Platform Admins pueden crear y gestionar invitaciones. Los usuarios invitados recibirán un email de confirmación.
          </p>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm.show && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px"
          }}>
            <div style={{
              background: "linear-gradient(135deg, #0c1929 0%, #0f2444 50%, #001a33 100%)",
              border: "1px solid rgba(0, 150, 255, 0.3)",
              borderRadius: "12px",
              padding: "32px",
              maxWidth: "400px",
              width: "100%",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)"
            }}>
              <div style={{ marginBottom: "24px", textAlign: "center" }}>
                <div style={{
                  width: "48px",
                  height: "48px",
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px"
                }}>
                  <Trash2 style={{ width: "24px", height: "24px", color: "#ef4444" }} />
                </div>
                <h3 style={{ fontSize: "18px", fontWeight: "600", color: "white", margin: "0 0 8px 0" }}>
                  Eliminar Invitación
                </h3>
                <p style={{ color: "#7dd3fc", fontSize: "14px", margin: 0 }}>
                  ¿Estás seguro de que quieres eliminar la invitación para <strong>{showDeleteConfirm.email}</strong>?
                </p>
              </div>

              <p style={{ color: "#8fd4ff", fontSize: "12px", marginBottom: "24px", marginTop: "16px", borderTop: "1px solid rgba(0, 150, 255, 0.2)", paddingTop: "16px" }}>
                Esta acción no se puede deshacer.
              </p>

              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <button
                  onClick={cancelDelete}
                  style={{
                    padding: "10px 20px",
                    background: "rgba(255, 255, 255, 0.1)",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    color: "#7dd3fc",
                    borderRadius: "8px",
                    fontWeight: "600",
                    cursor: "pointer",
                    fontSize: "14px",
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)"}
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  style={{
                    padding: "10px 20px",
                    background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                    border: "none",
                    color: "white",
                    borderRadius: "8px",
                    fontWeight: "600",
                    cursor: "pointer",
                    fontSize: "14px",
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
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
