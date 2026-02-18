"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/app/supabaseClient";
import { 
  Mail, Plus, Trash2, Edit2, CheckCircle, Clock, XCircle, 
  AlertCircle, Loader2, Shield, Copy, Check, User, Lock
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

const ROLE_LABELS: Record<string, string> = {
  developer: "👨‍💻 Developer",
  support: "🎧 Support",
  guest: "👤 Guest",
};

const ACCESS_LEVEL_LABELS: Record<string, string> = {
  full: "Acceso Completo",
  readonly: "Solo Lectura",
  limited: "Acceso Limitado",
};

const STATUS_LABELS: Record<string, { label: string; color: string; bgColor: string }> = {
  pending: { label: "Pendiente", color: "text-yellow-500", bgColor: "bg-yellow-500/10" },
  accepted: { label: "Aceptado", color: "text-green-500", bgColor: "bg-green-500/10" },
  rejected: { label: "Rechazado", color: "text-red-500", bgColor: "bg-red-500/10" },
  revoked: { label: "Revocado", color: "text-red-600", bgColor: "bg-red-500/10" },
};

export default function AdminInvitesManager() {
  const [invites, setInvites] = useState<AdminInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    role: "developer",
    access_level: "full",
    notes: "",
  });

  useEffect(() => {
    fetchInvites();
  }, []);

  // Auto-dismiss messages
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

  const handleDelete = async (id: string, email: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar la invitación para ${email}?`)) return;

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

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-slate-300">Cargando invitaciones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-blue-500" />
            <h1 className="text-3xl font-bold text-white">Control de Acceso</h1>
          </div>
          <p className="text-slate-400">Gestiona invitaciones para developers, support y guests</p>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            <p className="text-green-300">{success}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          {/* Stats */}
          <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <p className="text-slate-400 text-sm mb-1">Total Invitaciones</p>
            <p className="text-2xl font-bold text-white">{invites.length}</p>
          </div>
          <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <p className="text-slate-400 text-sm mb-1">Pendientes</p>
            <p className="text-2xl font-bold text-yellow-500">
              {invites.filter(i => i.status === "pending").length}
            </p>
          </div>
          <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <p className="text-slate-400 text-sm mb-1">Aceptadas</p>
            <p className="text-2xl font-bold text-green-500">
              {invites.filter(i => i.status === "accepted").length}
            </p>
          </div>
          <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <p className="text-slate-400 text-sm mb-1">Developers</p>
            <p className="text-2xl font-bold text-blue-500">
              {invites.filter(i => i.role === "developer").length}
            </p>
          </div>
        </div>

        {/* Form */}
        {showForm && (
          <div className="mb-8 p-6 rounded-lg bg-slate-800/50 border border-slate-700/50 backdrop-blur">
            <h2 className="text-xl font-semibold text-white mb-4">
              {editingId ? "Editar Invitación" : "Nueva Invitación"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    disabled={!!editingId}
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600/50 text-white rounded-lg focus:border-blue-500 outline-none transition disabled:opacity-50"
                    placeholder="developer@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Rol *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({ ...formData, role: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600/50 text-white rounded-lg focus:border-blue-500 outline-none transition"
                  >
                    <option value="developer">👨‍💻 Developer</option>
                    <option value="support">🎧 Support</option>
                    <option value="guest">👤 Guest</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Nivel de Acceso *
                  </label>
                  <select
                    value={formData.access_level}
                    onChange={(e) =>
                      setFormData({ ...formData, access_level: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600/50 text-white rounded-lg focus:border-blue-500 outline-none transition"
                  >
                    <option value="full">🔓 Acceso Completo</option>
                    <option value="readonly">👁️ Solo Lectura</option>
                    <option value="limited">🔐 Acceso Limitado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Notas (Opcional)
                  </label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600/50 text-white rounded-lg focus:border-blue-500 outline-none transition"
                    placeholder="Ej: Acceso temporal para testing"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium"
                >
                  {editingId ? "Actualizar" : "Crear Invitación"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                    setFormData({
                      email: "",
                      role: "developer",
                      access_level: "full",
                      notes: "",
                    });
                  }}
                  className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition font-medium"
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
            className="mb-8 flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg transition font-medium shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Nueva Invitación
          </button>
        )}

        {/* Invites Table */}
        <div className="rounded-lg bg-slate-800/50 border border-slate-700/50 overflow-hidden">
          {invites.length === 0 ? (
            <div className="p-12 text-center">
              <Mail className="w-12 h-12 text-slate-500 mx-auto mb-3" />
              <p className="text-slate-400">No hay invitaciones. Crea una nueva.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700/50 bg-slate-700/30">
                    <th className="px-6 py-3 text-left font-semibold text-slate-300">Email</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-300">Rol</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-300">Acceso</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-300">Estado</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-300">Creado</th>
                    <th className="px-6 py-3 text-right font-semibold text-slate-300">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {invites.map((invite) => (
                    <tr
                      key={invite.id}
                      className="border-b border-slate-700/30 hover:bg-slate-700/20 transition"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-white">
                          <User className="w-4 h-4 text-blue-400" />
                          {invite.email}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-slate-300">{ROLE_LABELS[invite.role]}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-700/50 text-xs text-slate-300">
                          <Lock className="w-3 h-3" />
                          {ACCESS_LEVEL_LABELS[invite.access_level]}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${STATUS_LABELS[invite.status].bgColor} ${STATUS_LABELS[invite.status].color}`}>
                          {invite.status === "pending" && <Clock className="w-3 h-3" />}
                          {invite.status === "accepted" && <CheckCircle className="w-3 h-3" />}
                          {invite.status === "rejected" && <XCircle className="w-3 h-3" />}
                          {STATUS_LABELS[invite.status].label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-xs">
                        {new Date(invite.created_at).toLocaleDateString("es-ES", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => handleEdit(invite)}
                            className="p-2 hover:bg-slate-700/50 text-slate-300 hover:text-blue-400 rounded transition"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(invite.id, invite.email)}
                            className="p-2 hover:bg-slate-700/50 text-slate-300 hover:text-red-400 rounded transition"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
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
        <div className="mt-8 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-300 text-sm">
          <p><strong>ℹ️ Nota:</strong> Solo los Platform Admins pueden crear y gestionar invitaciones. Los usuarios invitados recibirán un email de confirmación.</p>
        </div>
      </div>
    </div>
  );
}
