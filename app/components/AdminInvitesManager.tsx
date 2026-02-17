"use client";

import { useState, useEffect } from "react";
import { Mail, Plus, Trash2, Edit2, CheckCircle, Clock, XCircle } from "lucide-react";

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
  const [formData, setFormData] = useState({
    email: "",
    role: "developer",
    access_level: "full",
    notes: "",
  });

  useEffect(() => {
    fetchInvites();
  }, []);

  const fetchInvites = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("sb-auth-token");
      const response = await fetch("/api/platform/admin-invites", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch invites");
      const data = await response.json();
      setInvites(data);
    } catch (error) {
      console.error("Error fetching invites:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("sb-auth-token");

      if (editingId) {
        const response = await fetch("/api/platform/admin-invites", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ id: editingId, ...formData }),
        });

        if (!response.ok) throw new Error("Failed to update invite");
        await fetchInvites();
        setEditingId(null);
      } else {
        const response = await fetch("/api/platform/admin-invites", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to create invite");
        }
        await fetchInvites();
      }

      setFormData({
        email: "",
        role: "developer",
        access_level: "full",
        notes: "",
      });
      setShowForm(false);
    } catch (error) {
      console.error("Error saving invite:", error);
      alert(error instanceof Error ? error.message : "Error saving invite");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this invite?")) return;

    try {
      const token = localStorage.getItem("sb-auth-token");
      const response = await fetch(`/api/platform/admin-invites?id=${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to delete invite");
      await fetchInvites();
    } catch (error) {
      console.error("Error deleting invite:", error);
      alert("Error deleting invite");
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "accepted":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case "rejected":
      case "revoked":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  if (loading) {
    return <div className="text-center py-8">Cargando invitaciones...</div>;
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <div className="bg-slate-900 rounded-lg border border-slate-700 p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Mail className="w-6 h-6" />
              Admin & Developer Access
            </h2>
            <p className="text-slate-400 mt-1">
              Manage invitations for platform administrators and developers
            </p>
          </div>
          <button
            onClick={() => {
              setShowForm(!showForm);
              setEditingId(null);
              setFormData({
                email: "",
                role: "developer",
                access_level: "full",
                notes: "",
              });
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
          >
            <Plus className="w-4 h-4" />
            Nueva Invitación
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="mb-6 p-4 bg-slate-800 rounded-lg border border-slate-700">
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:border-blue-500 outline-none"
                    placeholder="developer@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Rol
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({ ...formData, role: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:border-blue-500 outline-none"
                  >
                    <option value="developer">Developer</option>
                    <option value="support">Support</option>
                    <option value="guest">Guest</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Nivel de Acceso
                  </label>
                  <select
                    value={formData.access_level}
                    onChange={(e) =>
                      setFormData({ ...formData, access_level: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:border-blue-500 outline-none"
                  >
                    <option value="full">Acceso Completo</option>
                    <option value="readonly">Solo Lectura</option>
                    <option value="limited">Acceso Limitado</option>
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
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:border-blue-500 outline-none"
                    placeholder="Notas sobre este acceso..."
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                >
                  {editingId ? "Actualizar" : "Crear Invitación"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                  }}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Invites List */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="px-4 py-3 text-left font-semibold text-slate-300">
                  Email
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-300">
                  Rol
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-300">
                  Acceso
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-300">
                  Estado
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-300">
                  Creado
                </th>
                <th className="px-4 py-3 text-right font-semibold text-slate-300">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {invites.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                    No hay invitaciones. Crea una nueva.
                  </td>
                </tr>
              ) : (
                invites.map((invite) => (
                  <tr
                    key={invite.id}
                    className="border-b border-slate-700 hover:bg-slate-800 transition"
                  >
                    <td className="px-4 py-3 text-white">{invite.email}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-slate-700 text-slate-200 rounded text-xs">
                        {invite.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-slate-700 text-slate-200 rounded text-xs">
                        {invite.access_level === "full" ? "Completo" : invite.access_level}
                      </span>
                    </td>
                    <td className="px-4 py-3 flex items-center gap-2">
                      {getStatusIcon(invite.status)}
                      <span className="capitalize text-slate-300">
                        {invite.status === "pending" ? "Pendiente" : invite.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {new Date(invite.created_at).toLocaleDateString("es-ES")}
                    </td>
                    <td className="px-4 py-3 text-right flex justify-end gap-2">
                      <button
                        onClick={() => handleEdit(invite)}
                        className="p-2 hover:bg-slate-700 text-slate-300 hover:text-blue-400 rounded transition"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(invite.id)}
                        className="p-2 hover:bg-slate-700 text-slate-300 hover:text-red-400 rounded transition"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
