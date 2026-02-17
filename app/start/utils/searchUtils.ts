/**
 * Utilidades para optimizar búsquedas y filtros de leads
 */

/**
 * Debounce una función
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle una función
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function (...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Normalizar texto para búsqueda (remover acentos, espacios, etc)
 */
export function normalizeSearchText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Crear índice de búsqueda para leads
 */
export function createLeadSearchIndex(lead: any): string {
  const searchableFields = [
    lead.name,
    lead.email,
    lead.phone,
    lead.asesor_nombre,
    lead.asesor,
    lead.source,
    lead.origen,
    lead.status,
  ];

  return normalizeSearchText(searchableFields.filter(Boolean).join(' '));
}

/**
 * Buscar en leads usando índice
 */
export function searchLeads(
  leads: any[],
  query: string,
  options?: {
    fields?: string[];
    caseSensitive?: boolean;
    exact?: boolean;
  }
): any[] {
  if (!query.trim()) return leads;

  const normalizedQuery = normalizeSearchText(query);
  const {
    fields = ['name', 'email', 'phone', 'asesor_nombre', 'asesor'],
    caseSensitive = false,
    exact = false,
  } = options || {};

  return leads.filter((lead) => {
    const searchIndex = createLeadSearchIndex(lead);
    
    if (exact) {
      return searchIndex === normalizedQuery;
    }
    
    return searchIndex.includes(normalizedQuery);
  });
}

/**
 * Filtrar leads por múltiples criterios
 */
export interface FilterCriteria {
  search?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  source?: string;
  advisor?: string;
  calificacion?: string;
}

export function filterLeads(
  leads: any[],
  criteria: FilterCriteria
): any[] {
  return leads.filter((lead) => {
    // Búsqueda de texto
    if (criteria.search) {
      const searchIndex = createLeadSearchIndex(lead);
      const normalizedSearch = normalizeSearchText(criteria.search);
      if (!searchIndex.includes(normalizedSearch)) {
        return false;
      }
    }

    // Filtro de estado
    if (criteria.status && criteria.status !== 'TODOS') {
      const leadStatus = (lead.status || '').toUpperCase().trim();
      if (leadStatus !== criteria.status.toUpperCase().trim()) {
        return false;
      }
    }

    // Filtro de fechas
    if (criteria.startDate || criteria.endDate) {
      const leadDate = new Date(lead.created_at);
      if (criteria.startDate && leadDate < criteria.startDate) {
        return false;
      }
      if (criteria.endDate) {
        const endDate = new Date(criteria.endDate);
        endDate.setHours(23, 59, 59, 999);
        if (leadDate > endDate) {
          return false;
        }
      }
    }

    // Filtro de fuente
    if (criteria.source) {
      const source = (lead.source || lead.origen || '').toLowerCase();
      if (!source.includes(criteria.source.toLowerCase())) {
        return false;
      }
    }

    // Filtro de asesor
    if (criteria.advisor) {
      const advisorName = (lead.asesor_nombre || '').toLowerCase();
      if (!advisorName.includes(criteria.advisor.toLowerCase())) {
        return false;
      }
    }

    // Filtro de calificación
    if (criteria.calificacion && criteria.calificacion !== 'TODAS') {
      const leadCalif = (lead.calificacion || '').toLowerCase();
      if (leadCalif !== criteria.calificacion.toLowerCase()) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Agrupar leads por criterio
 */
export function groupLeads(
  leads: any[],
  groupBy: 'status' | 'source' | 'advisor' | 'calificacion'
): Record<string, any[]> {
  const groups: Record<string, any[]> = {};

  leads.forEach((lead) => {
    const key =
      groupBy === 'status'
        ? lead.status || 'Sin estado'
        : groupBy === 'source'
          ? lead.source || lead.origen || 'Sin fuente'
          : groupBy === 'advisor'
            ? lead.asesor_nombre || 'Sin asesor'
            : lead.calificacion || 'Sin calificación';

    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(lead);
  });

  return groups;
}

/**
 * Paginar leads
 */
export interface PaginationResult<T> {
  items: T[];
  total: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export function paginateLeads<T extends { id: string }>(
  leads: T[],
  pageNumber: number = 1,
  pageSize: number = 20
): PaginationResult<T> {
  const total = leads.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, pageNumber), totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const endIdx = startIdx + pageSize;

  return {
    items: leads.slice(startIdx, endIdx),
    total,
    pageNumber: safePage,
    pageSize,
    totalPages,
    hasNextPage: safePage < totalPages,
    hasPrevPage: safePage > 1,
  };
}

/**
 * Ordenar leads
 */
export type SortField = 'name' | 'created_at' | 'status' | 'calificacion';
export type SortOrder = 'asc' | 'desc';

export function sortLeads(
  leads: any[],
  field: SortField,
  order: SortOrder = 'asc'
): any[] {
  const sorted = [...leads];
  
  sorted.sort((a, b) => {
    let aVal = a[field];
    let bVal = b[field];

    // Manejar valores nulos
    if (aVal == null) aVal = '';
    if (bVal == null) bVal = '';

    // Convertir a fecha si es necesario
    if (field === 'created_at') {
      aVal = new Date(aVal).getTime();
      bVal = new Date(bVal).getTime();
    }

    // Comparar
    if (aVal < bVal) return order === 'asc' ? -1 : 1;
    if (aVal > bVal) return order === 'asc' ? 1 : -1;
    return 0;
  });

  return sorted;
}
