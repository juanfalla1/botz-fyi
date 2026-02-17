/**
 * Hook personalizado para manejar actualizaciones en tiempo real de leads
 * Implementa:
 * - Suscripción a cambios en Supabase
 * - Debouncing de búsquedas
 * - Caching de datos
 * - Sincronización automática
 * 
 * ⚠️ IMPORTANTE: Estos hooks NO deben bloquear la carga inicial del CRM
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../components/supabaseClient';

export interface RealtimeLeadsOptions {
  tenantId: string;
  onDataChange?: (leads: any[]) => void;
  debounceMs?: number;
}

interface SubscriptionState {
  isSubscribed: boolean;
  channel: RealtimeChannel | null;
  error: string | null;
}

/**
 * Hook para suscribirse a cambios en tiempo real de leads
 * ⚠️ CRÍTICO: Solo se activa si tenantId es válido (no vacío)
 * No bloquea la carga del CRM
 */
export function useRealtimeLeads(options: RealtimeLeadsOptions) {
  const { tenantId, onDataChange, debounceMs = 500 } = options;
  const [subscription, setSubscription] = useState<SubscriptionState>({
    isSubscribed: false,
    channel: null,
    error: null,
  });

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const changeQueueRef = useRef<Set<string>>(new Set());

  // Limpiar debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // ⚠️ CRÍTICO: No iniciar suscripción sin tenantId válido
    if (!tenantId || tenantId.trim() === '') {
      setSubscription({
        isSubscribed: false,
        channel: null,
        error: null,
      });
      return;
    }

    let mounted = true;
    let channel: RealtimeChannel | null = null;

    const setupSubscription = () => {
      try {
        // Crear canal para cambios de leads de este tenant
        channel = supabase
          .channel(`realtime:leads:${tenantId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'leads',
              filter: `tenant_id=eq.${tenantId}`,
            },
            (payload) => {
              if (mounted) {
                changeQueueRef.current.add(`INSERT-${payload.new.id}`);
                scheduleRefresh();
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'leads',
              filter: `tenant_id=eq.${tenantId}`,
            },
            (payload) => {
              if (mounted) {
                changeQueueRef.current.add(`UPDATE-${payload.new.id}`);
                scheduleRefresh();
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'DELETE',
              schema: 'public',
              table: 'leads',
              filter: `tenant_id=eq.${tenantId}`,
            },
            (payload) => {
              if (mounted) {
                changeQueueRef.current.add(`DELETE-${payload.old.id}`);
                scheduleRefresh();
              }
            }
          )
          .subscribe((status) => {
            if (mounted) {
              console.log(`[Real-time] Subscription status for tenant ${tenantId}: ${status}`);
              setSubscription((prev) => ({
                ...prev,
                isSubscribed: status === 'SUBSCRIBED',
                error: status === 'CHANNEL_ERROR' ? 'Error en suscripción' : null,
              }));
            }
          });

        if (mounted) {
          setSubscription((prev) => ({ ...prev, channel }));
        }
      } catch (error) {
        console.error('[Real-time] Error setting up subscription:', error);
        if (mounted) {
          setSubscription((prev) => ({
            ...prev,
            error: `Error al suscribirse: ${String(error)}`,
          }));
        }
      }
    };

    // Ejecutar setup (no bloqueante)
    setupSubscription();

    // Cleanup function
    return () => {
      mounted = false;
      if (channel) {
        try {
          channel.unsubscribe();
        } catch (e) {
          console.error('[Real-time] Error unsubscribing:', e);
        }
      }
    };
  }, [tenantId]);

  // Debounce para refrescar datos
  const scheduleRefresh = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      if (onDataChange && changeQueueRef.current.size > 0) {
        console.log(
          '[Real-time] Cambios detectados:',
          Array.from(changeQueueRef.current).length
        );
        changeQueueRef.current.clear();
        onDataChange([]);
      }
    }, debounceMs);
  }, [debounceMs, onDataChange]);

  return {
    isSubscribed: subscription.isSubscribed,
    error: subscription.error,
    channel: subscription.channel,
  };
}

/**
 * Hook para debounce de búsqueda
 */
export function useDebouncedSearch(
  searchValue: string,
  callback: (value: string) => void,
  delay: number = 300
) {
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    debounceTimerRef.current = setTimeout(() => {
      callback(searchValue);
    }, delay);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchValue, callback, delay]);
}

/**
 * Hook para cache de datos con validación de tiempo
 */
export function useDataCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: {
    ttl?: number; // Tiempo de vida en ms (default: 5 minutos)
    enabled?: boolean;
  }
) {
  const { ttl = 5 * 60 * 1000, enabled = true } = options || {};
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cacheRef = useRef<{
    data: T | null;
    timestamp: number;
  }>({ data: null, timestamp: 0 });

  const isCacheValid = useCallback(() => {
    const now = Date.now();
    return cacheRef.current.data !== null && 
           now - cacheRef.current.timestamp < ttl;
  }, [ttl]);

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    // Si cache es válido, no refetchar
    if (isCacheValid()) {
      setData(cacheRef.current.data);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await fetcher();
      cacheRef.current = {
        data: result,
        timestamp: Date.now(),
      };
      setData(result);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [fetcher, enabled, isCacheValid]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const invalidate = useCallback(() => {
    cacheRef.current = { data: null, timestamp: 0 };
    fetchData();
  }, [fetchData]);

  return { data, loading, error, invalidate };
}

/**
 * Hook para paginación eficiente
 */
export function usePagination<T>(
  items: T[],
  pageSize: number = 20
) {
  const [currentPage, setCurrentPage] = useState(0);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const startIdx = currentPage * pageSize;
  const endIdx = startIdx + pageSize;
  const currentItems = items.slice(startIdx, endIdx);

  const goToPage = useCallback((page: number) => {
    const validPage = Math.max(0, Math.min(page, totalPages - 1));
    setCurrentPage(validPage);
  }, [totalPages]);

  const nextPage = useCallback(() => {
    goToPage(currentPage + 1);
  }, [currentPage, goToPage]);

  const prevPage = useCallback(() => {
    goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

  return {
    currentPage,
    totalPages,
    currentItems,
    goToPage,
    nextPage,
    prevPage,
    isFirstPage: currentPage === 0,
    isLastPage: currentPage === totalPages - 1,
  };
}
