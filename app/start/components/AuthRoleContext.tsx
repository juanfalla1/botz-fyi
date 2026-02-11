"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from './supabaseClient';

export type UserRole = 'admin' | 'asesor';

export interface UserWithRole {
  id: string;
  email: string;
  role: UserRole;
  tenant_id: string | null;
  team_member_id?: string | null;
  nombre?: string;
}

interface AuthContextType {
  user: UserWithRole | null;
  loading: boolean;
  isAdmin: boolean;
  isAsesor: boolean;
  canAccessAdminFeatures: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuthRole() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthRole must be used within an AuthRoleProvider');
  }
  return context;
}

export function AuthRoleProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserWithRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserWithRole = async () => {
    try {
      setLoading(true);
      console.log('AuthRoleContext: Fetching user...');
      
      // Obtener sesión actual
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('AuthRoleContext: Session error:', sessionError);
        setUser(null);
        setLoading(false);
        return;
      }
      
      if (!session?.user) {
        console.log('AuthRoleContext: No session found');
        setUser(null);
        setLoading(false);
        return;
      }

      console.log('AuthRoleContext: User found:', session.user.email);
      const authUser = session.user;
      
      // Prioridad 1: Intentar obtener tenant_id de auth.user metadata
      let tenantId = authUser.user_metadata?.tenant_id || authUser.app_metadata?.tenant_id || null;
      
      // Si no hay tenant_id en metadata, buscarlo desde team_members del mismo email
      if (!tenantId) {
        console.log('AuthRoleContext: No tenant_id en auth metadata, buscando desde team_members...');
        const { data: anyTenantMember } = await supabase
          .from('team_members')
          .select('tenant_id')
          .eq('email', authUser.email)
          .eq('activo', true)
          .not('tenant_id', 'is', 'null')
          .maybeSingle();
        
        if (anyTenantMember?.tenant_id) {
          tenantId = anyTenantMember.tenant_id;
          console.log('AuthRoleContext: Tenant_id encontrado desde team_members:', tenantId);
        }
      }
      
      console.log('AuthRoleContext: Final tenant_id:', tenantId, 'for user:', authUser.email);
      
      // Buscar si el usuario es un team_member (asesor)
      // Estrategia mejorada: multiple intentos
      let { data: teamMember, error: teamError } = await supabase
        .from('team_members')
        .select('id, nombre, email, rol, tenant_id')
        .eq('email', authUser.email)
        .eq('activo', true)
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (!teamMember && !teamError) {
        // Intento 1: Sin tenant_id (fallback)
        console.log('AuthRoleContext: Intento 1 - Sin tenant_id filter...');
        const { data: fallbackMember, error: fallbackError } = await supabase
          .from('team_members')
          .select('id, nombre, email, rol, tenant_id')
          .eq('email', authUser.email)
          .eq('activo', true)
          .maybeSingle();
        
        if (fallbackMember && !fallbackError) {
          teamMember = fallbackMember;
          // Si encontramos sin tenant_id, usar el tenant_id del member encontrado
          if (fallbackMember.tenant_id && !tenantId) {
            tenantId = fallbackMember.tenant_id;
            console.log('AuthRoleContext: Usando tenant_id del member:', tenantId);
          }
        } else {
          teamError = fallbackError;
        }
      }

      console.log('AuthRoleContext: === RESULTADOS DE BÚSQUEDA ===');
      console.log('Email buscado:', authUser.email);
      console.log('Tenant ID usado:', tenantId);
      console.log('Team member encontrado:', teamMember);
      console.log('Error en búsqueda:', teamError);
      
      if (teamMember) {
        console.log('✅ Team Member Details:', {
          id: teamMember.id,
          nombre: teamMember.nombre,
          email: teamMember.email,
          rol: teamMember.rol,
          tenant_id: teamMember.tenant_id
        });
      } else {
        console.log('❌ No se encontró team member');
      }

      if (teamError) {
        console.error('AuthRoleContext: Error fetching team member:', teamError);
      }

      // Determinar rol
      let role: UserRole = 'admin'; // Por defecto admin (el que compró)
      
      if (teamMember) {
        // Es un asesor creado por el admin
        role = (teamMember.rol === 'asesor') ? 'asesor' : 'admin';
        console.log('AuthRoleContext: ✅ User detected as team member');
        console.log('👤 Assigned role:', role);
        console.log('🏢 Tenant ID:', teamMember.tenant_id);
      } else {
        console.log('AuthRoleContext: ⚠️ User is admin (no team member record)');
      }

      const userToSet = {
        id: authUser.id,
        email: authUser.email || '',
        role,
        tenant_id: tenantId,
        team_member_id: teamMember?.id || null,
        nombre: teamMember?.nombre || authUser.user_metadata?.nombre || authUser.email
      };

      console.log('AuthRoleContext: === USUARIO FINAL ESTABLECIDO ===');
      console.log('👤 User Role:', role);
      console.log('📧 User Email:', authUser.email);
      console.log('🏢 User Tenant:', tenantId);
      console.log('🆔 Team Member ID:', teamMember?.id || null);
      console.log('👤 User Name:', teamMember?.nombre || authUser.user_metadata?.nombre || authUser.email);
      console.log('==========================================');

      setUser(userToSet);

    } catch (error) {
      console.error('AuthRoleContext: Error fetching user role:', error);
      setUser(null);
    } finally {
      setLoading(false);
      console.log('AuthRoleContext: Loading finished');
    }
  };

  useEffect(() => {
    // Timeout de seguridad: si después de 5 segundos sigue cargando, forzar fin
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.warn('AuthRoleContext: Loading timeout - forcing stop');
        setLoading(false);
      }
    }, 5000);

    fetchUserWithRole();

    // Suscribirse a cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      console.log('AuthRoleContext: Auth state changed:', event);
      fetchUserWithRole();
    });

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const value: AuthContextType = {
    user,
    loading,
    isAdmin: user?.role === 'admin',
    isAsesor: user?.role === 'asesor',
    canAccessAdminFeatures: user?.role === 'admin',
    refreshUser: fetchUserWithRole
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook auxiliar para filtrar leads según el rol
export function useLeadsFilter() {
  const { user } = useAuthRole();
  
  const getLeadsQuery = () => {
    let query = supabase.from('leads').select('*');
    
    // Siempre filtrar por tenant
    if (user?.tenant_id) {
      query = query.eq('tenant_id', user.tenant_id);
    }
    
    // Si es asesor, filtrar solo sus leads asignados
    if (user?.role === 'asesor' && user?.team_member_id) {
      query = query.eq('assigned_to', user.team_member_id);
    }
    
    return query;
  };

  const getLeadsCount = async (): Promise<number> => {
    let query = supabase.from('leads').select('*', { count: 'exact', head: true });
    
    if (user?.tenant_id) {
      query = query.eq('tenant_id', user.tenant_id);
    }
    
    if (user?.role === 'asesor' && user?.team_member_id) {
      query = query.eq('assigned_to', user.team_member_id);
    }
    
    const { count } = await query;
    return count || 0;
  };

  const canViewAllLeads = user?.role === 'admin';
  const canViewLead = (lead: any) => {
    if (user?.role === 'admin') return true;
    if (user?.role === 'asesor' && user?.team_member_id) {
      return lead.assigned_to === user.team_member_id;
    }
    return false;
  };

  return {
    getLeadsQuery,
    getLeadsCount,
    canViewAllLeads,
    canViewLead,
    userRole: user?.role,
    teamMemberId: user?.team_member_id
  };
}