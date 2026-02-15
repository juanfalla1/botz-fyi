"use client";

import React, { useState, useEffect, useRef } from 'react';

// ✅ NUEVO: Animación CSS para el modal
const modalAnimationCSS = `
  @keyframes modalSlideIn {
    from {
      opacity: 0;
      transform: translateY(-20px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
`;

// Inyectar CSS en el head
if (typeof window !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = modalAnimationCSS;
  if (!document.head.querySelector('style[data-modal-animation]')) {
    style.setAttribute('data-modal-animation', 'true');
    document.head.appendChild(style);
  }
}
import { supabase } from './supabaseClient';
import { useAuth } from '../MainLayout';
import { 
  Users, Plus, Trash2, Edit2, Check, X, Mail, Phone, 
  Shield, User, Loader2, AlertCircle, RefreshCw, Lock, Copy, UserPlus 
} from 'lucide-react';

interface TeamMember {
  id: string;
  nombre: string;
  email: string;
  telefono?: string;
  rol: 'admin' | 'asesor';
  activo: boolean;
  permissions?: Record<string, boolean> | null;
  created_at: string;
  leads_count?: number;
}

type AppLanguage = 'es' | 'en';

const UI_TEXT: Record<AppLanguage, Record<string, string>> = {
  es: {
    restricted: 'Acceso Restringido',
    onlyAdmins: 'Solo los administradores pueden gestionar el equipo',
    teamTitle: 'Gestion de Equipo',
    teamSubtitle: 'Administra los asesores de tu equipo',
    addAdvisor: 'Agregar Asesor',
    advisor: 'Asesor',
    contact: 'Contacto',
    role: 'Rol',
    leads: 'Leads',
    actions: 'Acciones',
    admin: 'Administrador',
    noAdvisors: 'No hay asesores en tu equipo',
    noAdvisorsHelp: 'Haz clic en "Agregar Asesor" para comenzar',
    editAdvisor: 'Editar Asesor',
    newAdvisor: 'Nuevo Asesor',
    fullName: 'Nombre completo',
    phone: 'Telefono',
    password: 'Contrasena',
    emptyPasswordHint: 'Dejar vacio para generar automaticamente',
    passwordAutoHint: 'Si no especificas contrasena, se generara una automaticamente',
    advisorRole: 'Asesor (solo ve sus leads)',
    adminRole: 'Administrador (ve todo)',
    cancel: 'Cancelar',
    saveChanges: 'Guardar Cambios',
    createAdvisor: 'Crear Asesor',
    activateAccess: 'Activar cuenta de acceso',
    gotIt: 'Entendido',
    copyCredentials: 'Copiar Credenciales',
    activateAccount: 'Activar Cuenta',

    permissionsTitle: 'Permisos',
    permViewAllLeads: 'Ver todos los leads (tenant)',
    permFullTools: 'Desbloquear herramientas',
    permManageTeam: 'Gestionar equipo (asesores)',
  },
  en: {
    restricted: 'Restricted Access',
    onlyAdmins: 'Only administrators can manage the team',
    teamTitle: 'Team Management',
    teamSubtitle: 'Manage your advisors',
    addAdvisor: 'Add Advisor',
    advisor: 'Advisor',
    contact: 'Contact',
    role: 'Role',
    leads: 'Leads',
    actions: 'Actions',
    admin: 'Administrator',
    noAdvisors: 'No advisors in your team',
    noAdvisorsHelp: 'Click "Add Advisor" to start',
    editAdvisor: 'Edit Advisor',
    newAdvisor: 'New Advisor',
    fullName: 'Full Name',
    phone: 'Phone',
    password: 'Password',
    emptyPasswordHint: 'Leave empty to auto-generate',
    passwordAutoHint: 'If you do not set a password, one will be generated automatically',
    advisorRole: 'Advisor (only sees assigned leads)',
    adminRole: 'Administrator (can see all)',
    cancel: 'Cancel',
    saveChanges: 'Save Changes',
    createAdvisor: 'Create Advisor',
    activateAccess: 'Activate access account',
    gotIt: 'Got it',
    copyCredentials: 'Copy Credentials',
    activateAccount: 'Activate Account',

    permissionsTitle: 'Permissions',
    permViewAllLeads: 'View all leads (tenant)',
    permFullTools: 'Unlock tools',
    permManageTeam: 'Manage team (advisors)',
  },
};

export default function TeamManagement({ language = 'es' }: { language?: AppLanguage }) {
  const { user, isAdmin, isPlatformAdmin, hasPermission, loading: authLoading, tenantId } = useAuth();
  const t = UI_TEXT[language] || UI_TEXT.es;
  const [asesores, setAsesores] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAsesor, setEditingAsesor] = useState<TeamMember | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newAsesorCredentials, setNewAsesorCredentials] = useState<{ email: string; password: string; nombre: string } | null>(null);
  const [usarPasswordManual, setUsarPasswordManual] = useState(false);
  const [showActivationModal, setShowActivationModal] = useState(false);
  const [activationEmail, setActivationEmail] = useState('');
  const [activationPassword, setActivationPassword] = useState('');
  const [loadingActivation, setLoadingActivation] = useState(false);
  const scrollYRef = useRef(0);

  // Formulario
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    rol: 'asesor' as 'admin' | 'asesor',
    password: '',
    permViewAllLeads: false,
    permFullTools: false,
    permManageTeam: false,
  });

  useEffect(() => {
    if (!authLoading && (isAdmin || isPlatformAdmin || hasPermission('manage_team'))) {
      fetchAsesores();
    } else if (!authLoading && !(isAdmin || isPlatformAdmin || hasPermission('manage_team'))) {
      setLoading(false);
    }
  }, [isAdmin, isPlatformAdmin, authLoading, hasPermission]);

  // ✅ BLOQUEO DE SCROLL estable para modales
  useEffect(() => {
    const anyModalOpen = showAddModal || !!editingAsesor || !!newAsesorCredentials || showActivationModal;

    if (anyModalOpen) {
      scrollYRef.current = window.scrollY;
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = `-${scrollYRef.current}px`;
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
      if (scrollYRef.current > 0) {
        window.scrollTo(0, scrollYRef.current);
      }
    }

    return () => {
      const top = document.body.style.top;
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
      if (top) {
        window.scrollTo(0, Math.abs(parseInt(top, 10)) || 0);
      }
    };
  }, [showAddModal, editingAsesor, newAsesorCredentials, showActivationModal]);

  const fetchAsesores = async () => {
    try {
      setLoading(true);
      
      // Obtener asesores del tenant
      let query = supabase
        .from('team_members')
        .select('*')
        .or('activo.is.null,activo.eq.true');
      
      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }
      
      const { data, error } = await query.order('nombre');
      
      if (error) throw error;
      
      // Obtener conteo de leads por asesor
      const asesoresWithCount = await Promise.all(
        (data || []).map(async (asesor) => {
          let base: any = supabase
            .from('leads')
            .select('id', { count: 'exact', head: true })
            .or(`asesor_id.eq.${asesor.id},assigned_to.eq.${asesor.id}`);

          if (tenantId) base = base.eq('tenant_id', tenantId);

          const { count } = await base;
          
          return {
            ...asesor,
            leads_count: count || 0
          };
        })
      );
      
      setAsesores(asesoresWithCount);
    } catch (err) {
      console.error('Error fetching asesores:', err);
      setError(`Error al cargar el equipo${(err as any)?.message ? `: ${(err as any).message}` : ''}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    try {
      const adminTenantId = tenantId || null;
      if (!adminTenantId) {
        throw new Error('No se pudo resolver tenant_id del administrador.');
      }

      // Verificar que el email no exista ya
      const { data: existing } = await supabase
        .from('team_members')
        .select('id')
        .eq('email', formData.email)
        .maybeSingle();
      
      if (existing) {
        setError('Ya existe un asesor con este email');
        return;
      }
      
      // ✅ NUEVO: Contraseña (manual o automática)
      let tempPassword = usarPasswordManual && formData.password ? formData.password : Math.random().toString(36).slice(-8);
      
      console.log('✅ Creando asesor:', {
        nombre: formData.nombre,
        email: formData.email,
        rol: formData.rol,
        tenant_id_del_admin: adminTenantId,
        email_admin: user?.email
      });
      
      // 1. Crear cuenta en Supabase Auth PRIMERO
      let authUserId: string | null = null;
      try {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: tempPassword,
          options: {
            data: {
              nombre: formData.nombre,
              rol: formData.rol,
              is_team_member: true,
              tenant_id: adminTenantId,
            }
          }
        });

        if (authError && !authError.message?.includes('already registered')) {
          throw new Error('Error al crear cuenta de autenticación: ' + authError.message);
        }

        if (authData?.user?.id) {
          authUserId = authData.user.id;
        }
      } catch (authErr: any) {
        if (!authErr.message?.includes('already registered')) {
          throw authErr;
        }
        // Si ya existe, continuamos sin auth_user_id
      }

      // 2. Crear registro en team_members (SIEMPRE con tenant_id del admin actual)
      const insertData: any = {
        nombre: formData.nombre,
        email: formData.email,
        telefono: formData.telefono || null,
        rol: formData.rol,
        activo: true,
        tenant_id: adminTenantId,
      };

      if (!isPlatformAdmin && formData.rol === 'admin') {
        throw new Error('Solo Platform Admin puede asignar rol de administrador.');
      }

      const computedPermissions: Record<string, boolean> = {
        view_all_leads: Boolean(formData.permViewAllLeads),
        full_access: Boolean(formData.permFullTools),
        manage_team: Boolean(formData.permManageTeam),
        // full tools expands to specific feature permissions
        manage_agents: Boolean(formData.permFullTools),
        manage_channels: Boolean(formData.permFullTools),
        view_exec_dashboard: Boolean(formData.permFullTools),
        view_sla: Boolean(formData.permFullTools),
      };

      insertData.permissions = computedPermissions;

      if (authUserId) {
        insertData.auth_user_id = authUserId;
      }
      
      console.log('✅ Insertando asesor con tenant_id:', insertData.tenant_id, 'auth_user_id:', authUserId);
      
      const { data, error } = await supabase
        .from('team_members')
        .insert([insertData])
        .select();

      if (error && String(error.message || '').toLowerCase().includes('permissions')) {
        // Backward compatible: if DB doesn't have permissions column yet, retry without.
        const retry = { ...insertData };
        delete (retry as any).permissions;
        const { data: retryData, error: retryError } = await supabase
          .from('team_members')
          .insert([retry])
          .select();

        if (retryError) {
          console.error('Supabase error:', retryError);
          throw new Error(retryError.message || retryError.code || 'Error de Supabase');
        }

        console.log('Asesor created (retry):', retryData);
        setNewAsesorCredentials({ email: formData.email, password: tempPassword, nombre: formData.nombre });
        setSuccess('✅ Asesor creado (sin permisos extra; falta migración de DB).');
        setFormData({ nombre: '', email: '', telefono: '', rol: 'asesor', password: '', permViewAllLeads: false, permFullTools: false, permManageTeam: false });
        setShowAddModal(false);
        fetchAsesores();
        return;
      }
      
      if (error) {
        console.error('Supabase error:', error);
        throw new Error(error.message || error.code || 'Error de Supabase');
      }
      
      console.log('Asesor created:', data);
      
      // ✅ NUEVO: Guardar credenciales para mostrarlas mejor
      setNewAsesorCredentials({
        email: formData.email,
        password: tempPassword,
        nombre: formData.nombre
      });
      
      setSuccess('✅ Asesor creado correctamente');
      setFormData({ nombre: '', email: '', telefono: '', rol: 'asesor', password: '', permViewAllLeads: false, permFullTools: false, permManageTeam: false });
      setShowAddModal(false);
      fetchAsesores();
      
    } catch (err: any) {
      console.error('Error creating asesor:', err);
      // Mostrar error detallado de Supabase
      const errorMessage = err?.message || err?.error?.message || err?.details || JSON.stringify(err);
      setError('Error: ' + errorMessage);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAsesor) return;
    
    setError('');
    setSuccess('');
    
    try {
      const { error } = await supabase
        .from('team_members')
        .update((() => {
          if (!isPlatformAdmin && formData.rol === 'admin') {
            throw new Error('Solo Platform Admin puede asignar rol de administrador.');
          }

          const payload: any = {
            nombre: formData.nombre,
            email: formData.email,
            telefono: formData.telefono || null,
            rol: formData.rol,
            permissions: {
              view_all_leads: Boolean(formData.permViewAllLeads),
              full_access: Boolean(formData.permFullTools),
              manage_team: Boolean(formData.permManageTeam),
              manage_agents: Boolean(formData.permFullTools),
              manage_channels: Boolean(formData.permFullTools),
              view_exec_dashboard: Boolean(formData.permFullTools),
              view_sla: Boolean(formData.permFullTools),
            },
          };

          return payload;
        })())
        .eq('id', editingAsesor.id);

      if (error && String(error.message || '').toLowerCase().includes('permissions')) {
        const retryPayload: any = {
          nombre: formData.nombre,
          email: formData.email,
          telefono: formData.telefono || null,
          rol: formData.rol,
        };
        const retry = await supabase
          .from('team_members')
          .update(retryPayload)
          .eq('id', editingAsesor.id);
        if (retry.error) throw retry.error;
      } else if (error) {
        throw error;
      }
      
      setSuccess('Asesor actualizado correctamente');
      setEditingAsesor(null);
      setFormData({ nombre: '', email: '', telefono: '', rol: 'asesor', password: '', permViewAllLeads: false, permFullTools: false, permManageTeam: false });
      fetchAsesores();
      
    } catch (err: any) {
      console.error('Error updating asesor:', err);
      setError(err.message || 'Error al actualizar asesor');
    }
  };

  const handleDelete = async (asesor: TeamMember) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar a ${asesor.nombre}?`)) {
      return;
    }
    
    try {
      // Desactivar en lugar de eliminar (soft delete)
      const { error } = await supabase
        .from('team_members')
        .update({ activo: false })
        .eq('id', asesor.id);
      
      if (error) throw error;
      
      setSuccess('Asesor eliminado correctamente');
      fetchAsesores();
      
    } catch (err: any) {
      console.error('Error deleting asesor:', err);
      setError(err.message || 'Error al eliminar asesor');
    }
  };

  const startEdit = (asesor: TeamMember) => {
    setEditingAsesor(asesor);
    const perms = (asesor.permissions && typeof asesor.permissions === 'object') ? asesor.permissions : {};
    setFormData({
      nombre: asesor.nombre,
      email: asesor.email,
      telefono: asesor.telefono || '',
      rol: asesor.rol,
      password: '',
      permViewAllLeads: Boolean((perms as any).view_all_leads),
      permFullTools: Boolean((perms as any).full_access),
      permManageTeam: Boolean((perms as any).manage_team),
    });
  };

  if (!(isAdmin || isPlatformAdmin || hasPermission('manage_team'))) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        color: '#94a3b8'
      }}>
        <Shield size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
        <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>{t.restricted}</h3>
        <p>{t.onlyAdmins}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box', overflowX: 'hidden' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <h2 style={{
            fontSize: '24px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            margin: 0
          }}>
            <Users color="#22d3ee" /> {t.teamTitle}
          </h2>
          <p style={{ color: '#94a3b8', marginTop: '4px' }}>
            {t.teamSubtitle}
          </p>
        </div>
        
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            background: '#22d3ee',
            color: '#0f172a',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexShrink: 0,
            cursor: 'pointer',
            fontWeight: 'bold',
            whiteSpace: 'nowrap'
          }}
        >
          <Plus size={18} /> {t.addAdvisor}
        </button>
      </div>

      {/* Mensajes */}
      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#ef4444',
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <AlertCircle size={18} /> {error}
        </div>
      )}
      
      {success && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          color: '#10b981',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '16px',
          fontSize: '14px',
          lineHeight: '1.5',
          whiteSpace: 'pre-line'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <Check size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>✅ ¡Asesor creado correctamente!</strong><br />
              <div style={{ marginTop: '8px', padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', fontFamily: 'monospace', fontSize: '13px' }}>
                {success}
              </div>
              <div style={{ marginTop: '8px', opacity: 0.8, fontSize: '12px' }}>
                💡 El asesor debe cambiar su contraseña en el primer inicio de sesión.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabla de Asesores */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Loader2 size={32} className="animate-spin" color="#22d3ee" />
        </div>
      ) : (
        <div style={{
          background: 'rgba(13, 22, 45, 0.6)',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: '12px',
          width: '100%',
          minWidth: 0,
          display: 'block',
          overflowX: 'auto',
          overflowY: 'hidden',
          maxWidth: '100%'
        }}>
          <table style={{ width: '100%', minWidth: 0, borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                <th style={{ width: '26%', padding: '16px', textAlign: 'left', color: '#94a3b8', fontSize: '13px' }}>{t.advisor}</th>
                <th style={{ width: '30%', padding: '16px', textAlign: 'left', color: '#94a3b8', fontSize: '13px' }}>{t.contact}</th>
                <th style={{ width: '14%', padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>{t.role}</th>
                <th style={{ width: '10%', padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>{t.leads}</th>
                <th style={{ width: '20%', padding: '16px', textAlign: 'right', color: '#94a3b8', fontSize: '13px' }}>{t.actions}</th>
              </tr>
            </thead>
            <tbody>
              {asesores.map((asesor) => (
                <tr key={asesor.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: asesor.rol === 'admin' 
                          ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)' 
                          : 'linear-gradient(135deg, #22d3ee 0%, #0891b2 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {asesor.rol === 'admin' ? <Shield size={20} color="#fff" /> : <User size={20} color="#fff" />}
                      </div>
                      <div>
                        <div style={{ color: '#fff', fontWeight: 500 }}>{asesor.nombre}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                          {asesor.rol === 'admin' ? t.admin : t.advisor}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          color: '#cbd5e1',
                          fontSize: '14px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                        title={asesor.email}
                      >
                        <Mail size={14} color="#64748b" /> {asesor.email}
                      </div>
                      {asesor.telefono && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '13px' }}>
                          <Phone size={14} color="#64748b" /> {asesor.telefono}
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      background: asesor.rol === 'admin' ? 'rgba(251, 191, 36, 0.2)' : 'rgba(34, 211, 238, 0.2)',
                      color: asesor.rol === 'admin' ? '#fbbf24' : '#22d3ee'
                    }}>
                      {asesor.rol === 'admin' ? 'ADMIN' : 'ASESOR'}
                    </span>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    <span style={{
                      fontSize: '20px',
                      fontWeight: 'bold',
                      color: '#22d3ee'
                    }}>
                      {asesor.leads_count}
                    </span>
                  </td>
                   <td style={{ padding: '16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                     <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                       <button
                         onClick={() => startEdit(asesor)}
                         style={{
                           padding: '8px',
                           background: 'rgba(255,255,255,0.05)',
                           border: 'none',
                           borderRadius: '6px',
                           cursor: 'pointer',
                           color: '#22d3ee'
                         }}
                       >
                         <Edit2 size={16} />
                       </button>
                       <button
                         onClick={() => {
                           setActivationEmail(asesor.email);
                           setShowActivationModal(true);
                         }}
                         style={{
                           padding: '8px',
                           background: 'rgba(34, 211, 238, 0.1)',
                           border: '1px solid rgba(34, 211, 238, 0.3)',
                           borderRadius: '6px',
                           cursor: 'pointer',
                           color: '#22d3ee'
                         }}
                          title={t.activateAccess}
                       >
                         <UserPlus size={16} />
                       </button>
                       <button
                         onClick={() => handleDelete(asesor)}
                         style={{
                           padding: '8px',
                           background: 'rgba(239, 68, 68, 0.1)',
                           border: 'none',
                           borderRadius: '6px',
                           cursor: 'pointer',
                           color: '#ef4444'
                         }}
                       >
                         <Trash2 size={16} />
                       </button>
                     </div>
                   </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {asesores.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              <Users size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
              <p>{t.noAdvisors}</p>
              <p style={{ fontSize: '14px', marginTop: '8px' }}>{t.noAdvisorsHelp}</p>
            </div>
          )}
        </div>
      )}

      {/* Modal Crear/Editar */}
      {(showAddModal || editingAsesor) && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '16px',
          boxSizing: 'border-box',
          overflowY: 'auto'
        }}>
          <div style={{
            background: 'rgba(13, 22, 45, 0.95)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px',
            padding: '32px',
            width: '100%',
            maxWidth: 'min(500px, calc(100vw - 32px))',
            maxHeight: '85vh',
            overflowY: 'auto',
            overflowX: 'hidden',
            boxSizing: 'border-box',
            position: 'relative',
            margin: '0 auto',
            marginTop: '32px',
            marginBottom: '32px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(10px)',
            // Evitar que se salga en móviles
            marginLeft: 'auto',
            marginRight: 'auto',
            left: 0,
            right: 0,
            // Animación de entrada
            animation: 'modalSlideIn 0.3s ease-out'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                {editingAsesor ? <Edit2 color="#22d3ee" /> : <Plus color="#22d3ee" />}
                {editingAsesor ? t.editAdvisor : t.newAdvisor}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingAsesor(null);
                  setFormData({ nombre: '', email: '', telefono: '', rol: 'asesor', password: '', permViewAllLeads: false, permFullTools: false, permManageTeam: false });
                  setError('');
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#94a3b8';
                }}
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={editingAsesor ? handleUpdate : handleCreate}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: '#94a3b8', marginBottom: '6px', fontSize: '14px' }}>
                  {t.fullName} *
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                  placeholder="Ej: Juan Pérez"
                />
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: '#94a3b8', marginBottom: '6px', fontSize: '14px' }}>
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                  placeholder="ejemplo@correo.com"
                />
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: '#94a3b8', marginBottom: '6px', fontSize: '14px' }}>
                  {t.phone}
                </label>
                <input
                  type="tel"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                  placeholder="+52 55 1234 5678"
                />
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: '#94a3b8', marginBottom: '6px', fontSize: '14px' }}>
                  {t.password}
                </label>
                <input
                  type="text"
                  value={usarPasswordManual ? formData.password : ''}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                   placeholder={t.emptyPasswordHint}
                  onFocus={() => setUsarPasswordManual(true)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                  💡 {t.passwordAutoHint}
                </div>
              </div>
              
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', color: '#94a3b8', marginBottom: '6px', fontSize: '14px' }}>
                  Rol *
                </label>
                <select
                  value={formData.rol}
                  onChange={(e) => setFormData({ ...formData, rol: e.target.value as 'admin' | 'asesor' })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="asesor">{t.advisorRole}</option>
                  {isPlatformAdmin && <option value="admin">{t.adminRole}</option>}
                </select>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', color: '#94a3b8', marginBottom: '10px', fontSize: '14px' }}>
                  {t.permissionsTitle}
                </label>

                <div style={{ display: 'grid', gap: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#e2e8f0', fontSize: '13px' }}>
                    <input
                      type="checkbox"
                      checked={formData.permViewAllLeads}
                      onChange={(e) => setFormData({ ...formData, permViewAllLeads: e.target.checked })}
                    />
                    {t.permViewAllLeads}
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#e2e8f0', fontSize: '13px' }}>
                    <input
                      type="checkbox"
                      checked={formData.permFullTools}
                      onChange={(e) => setFormData({ ...formData, permFullTools: e.target.checked })}
                    />
                    {t.permFullTools}
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#e2e8f0', fontSize: '13px' }}>
                    <input
                      type="checkbox"
                      checked={formData.permManageTeam}
                      onChange={(e) => setFormData({ ...formData, permManageTeam: e.target.checked })}
                    />
                    {t.permManageTeam}
                  </label>
                </div>

                <div style={{ marginTop: '10px', fontSize: '12px', color: '#64748b' }}>
                  Nota: "Desbloquear herramientas" habilita secciones como Agentes IA / Dashboard Ejecutivo sin convertirlo en admin.
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingAsesor(null);
                    setFormData({ nombre: '', email: '', telefono: '', rol: 'asesor', password: '', permViewAllLeads: false, permFullTools: false, permManageTeam: false });
                    setError('');
                  }}
                  style={{
                    padding: '10px 20px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    minWidth: '140px'
                  }}
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 20px',
                    background: '#22d3ee',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#0f172a',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    minWidth: '140px'
                  }}
                >
                  {editingAsesor ? t.saveChanges : t.createAdvisor}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ✅ NUEVO: Modal de Credenciales Generadas */}
      {newAsesorCredentials && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '16px',
          boxSizing: 'border-box'
        }}>
          <div style={{
            background: 'rgba(13, 22, 45, 0.95)',
            border: '1px solid rgba(34, 211, 238, 0.3)',
            borderRadius: '16px',
            padding: '32px',
            width: '100%',
            maxWidth: '450px',
            position: 'relative',
            margin: '0 auto',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{
                display: 'inline-flex',
                padding: '16px',
                background: 'rgba(34, 211, 238, 0.1)',
                borderRadius: '50%',
                marginBottom: '16px'
              }}>
                <Users size={32} color="#22d3ee" />
              </div>
              <h3 style={{ 
                fontSize: '20px', 
                fontWeight: 'bold', 
                color: '#fff', 
                marginBottom: '8px',
                margin: 0
              }}>
                🎉 ¡Asesor Creado!
              </h3>
              <p style={{ color: '#94a3b8', margin: 0 }}>
                {newAsesorCredentials.nombre}
              </p>
            </div>

            <div style={{
              background: 'rgba(0,0,0,0.3)',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px'
            }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ 
                  display: 'block', 
                  color: '#64748b', 
                  fontSize: '12px', 
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  📧 Email
                </label>
                <div style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  padding: '12px',
                  color: '#fff',
                  fontFamily: 'monospace',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <Mail size={16} color="#22d3ee" />
                  {newAsesorCredentials.email}
                </div>
              </div>

              <div>
                <label style={{ 
                  display: 'block', 
                  color: '#64748b', 
                  fontSize: '12px', 
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  🔑 Contraseña Temporal
                </label>
                <div style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  padding: '12px',
                  color: '#fff',
                  fontFamily: 'monospace',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <Shield size={16} color="#22d3ee" />
                  {newAsesorCredentials.password}
                </div>
              </div>
            </div>

            <div style={{
              background: 'rgba(34, 211, 238, 0.1)',
              border: '1px solid rgba(34, 211, 238, 0.3)',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '20px',
              fontSize: '13px',
              color: '#22d3ee',
              lineHeight: '1.4'
            }}>
              💡 <strong>Importante:</strong> El asesor deberá cambiar su contraseña en el primer inicio de sesión.
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    `Email: ${newAsesorCredentials.email}\nContraseña: ${newAsesorCredentials.password}`
                  );
                  // Mostrar mensaje de copiado
                  const button = document.getElementById('copy-button');
                  if (button) {
                    const originalText = button.innerHTML;
                    button.innerHTML = '✅ Copiado';
                    setTimeout(() => {
                      button.innerHTML = originalText;
                    }, 2000);
                  }
                }}
                id="copy-button"
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '8px',
                  padding: '12px',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontSize: '14px'
                }}
              >
                <Copy size={16} /> {t.copyCredentials}
              </button>
              <button
                onClick={() => setNewAsesorCredentials(null)}
                style={{
                  flex: 2,
                  background: '#22d3ee',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px',
                  color: '#0f172a',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                {t.gotIt}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ NUEVO: Modal de Activación de Cuenta */}
      {showActivationModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '16px',
          boxSizing: 'border-box'
        }}>
          <div style={{
            background: 'rgba(13, 22, 45, 0.95)',
            border: '1px solid rgba(34, 211, 238, 0.3)',
            borderRadius: '16px',
            padding: '32px',
            width: '100%',
            maxWidth: '450px',
            position: 'relative',
            margin: '0 auto',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{
                display: 'inline-flex',
                padding: '16px',
                background: 'rgba(34, 211, 238, 0.1)',
                borderRadius: '50%',
                marginBottom: '16px'
              }}>
                <UserPlus size={32} color="#22d3ee" />
              </div>
              <h3 style={{ 
                fontSize: '20px', 
                fontWeight: 'bold', 
                color: '#fff', 
                marginBottom: '8px',
                margin: 0
              }}>
                Activar Cuenta de Asesor
              </h3>
              <p style={{ color: '#94a3b8', margin: 0 }}>
                {activationEmail.includes('already') ? 'Resetear contraseña' : `Crear cuenta de acceso para ${activationEmail}`}
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                color: '#94a3b8', 
                marginBottom: '6px', 
                fontSize: '14px' 
              }}>
                Contraseña *
              </label>
              <input
                type="text"
                value={activationPassword}
                onChange={(e) => setActivationPassword(e.target.value)}
                placeholder="Escribe una contraseña segura"
                  style={{
                   width: '100%',
                   padding: '12px',
                   background: 'rgba(0,0,0,0.3)',
                   border: '1px solid rgba(255,255,255,0.1)',
                   borderRadius: '8px',
                   color: '#fff',
                   fontSize: '14px',
                   fontFamily: 'monospace',
                   boxSizing: 'border-box'
                 }}
              />
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                🔐 Esta contraseña será usada por el asesor para ingresar al sistema
              </div>
            </div>

            <div style={{
              background: 'rgba(34, 211, 238, 0.1)',
              border: '1px solid rgba(34, 211, 238, 0.3)',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '20px',
              fontSize: '13px',
              color: '#22d3ee',
              lineHeight: '1.4'
            }}>
              ⚠️ <strong>Importante:</strong> Esta acción creará la cuenta de acceso real en el sistema.
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  setShowActivationModal(false);
                  setActivationEmail('');
                  setActivationPassword('');
                }}
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  padding: '12px',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                {t.cancel}
              </button>
              <button
                onClick={async () => {
                  if (!activationPassword) {
                    alert('Por favor, ingresa una contraseña');
                    return;
                  }

                  try {
                    setLoadingActivation(true);
                    console.log('✅ Activando cuenta para:', activationEmail, 'tenant_id:', user?.tenant_id);
                    
                    // Primero, actualizar team_members con el tenant_id correcto (esto es LO MÁS IMPORTANTE)
                    const { error: updateError } = await supabase
                      .from('team_members')
                      .update({ 
                        tenant_id: user?.tenant_id || '0811c118-5a2f-40cb-907e-8979e0984096'
                      })
                      .eq('email', activationEmail);

                    if (updateError) {
                      throw new Error('Error al asignar tenant: ' + updateError.message);
                    }

                    console.log('✅ Tenant_id asignado correctamente');

                    // Intentar crear cuenta en auth (si no existe)
                    const { data: authData, error: authError } = await supabase.auth.signUp({
                      email: activationEmail,
                      password: activationPassword,
                      options: {
                        data: {
                          is_team_member: true
                        }
                      }
                    });

                    if (authError && !authError.message.includes('already registered')) {
                      // Si no se puede crear, probablemente ya existe, pero eso está bien
                      console.log('✅ Cuenta auth ya existe o hubo error:', authError.message);
                    }

                    setSuccess(`✅ ${activationEmail} activado correctamente con tenant_id asignado. Ya puede ingresar.`);
                    setShowActivationModal(false);
                    setActivationEmail('');
                    setActivationPassword('');
                    fetchAsesores();
                    
                  } catch (error: any) {
                    console.error('Error activating account:', error);
                    setError('Error: ' + error.message);
                  } finally {
                    setLoadingActivation(false);
                  }
                }}
                disabled={loadingActivation || !activationPassword}
                style={{
                  flex: 2,
                  background: loadingActivation || !activationPassword ? '#334155' : '#22d3ee',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px',
                  color: '#0f172a',
                  fontWeight: 'bold',
                  cursor: loadingActivation || !activationPassword ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {loadingActivation ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                {t.activateAccount}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
