"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "../components/supabaseClient";
import type { Lead } from "../components/LeadsTable";

type CRMQueryParams = {
  tenantId?: string | null;
  days?: number;
  isAsesor?: boolean;
  teamMemberId?: string | null;
  userId?: string | null;
};

// Lightweight CRM leads fetcher for initial cacheable data
export function useCRMLeadsQuery(params: CRMQueryParams) {
  const { tenantId, userId, days = 30, isAsesor, teamMemberId } = params;

  const fetchLeads = async (): Promise<Lead[]> => {
    // Build a lightweight query; fetch up to 100 leads for initial render
    let q = supabase.from("leads").select("*").limit(100);
    if (tenantId) q = q.eq("tenant_id", tenantId);
    if (userId) q = q.eq("user_id", userId);
    if (isAsesor && teamMemberId) {
      q = q.or(`asesor_id.eq.${teamMemberId},assigned_to.eq.${teamMemberId}`);
    }
    const { data, error } = await q;
    if (error) throw error;
    return (data as Lead[]) || [];
  };

  const result = useQuery<Lead[]>([
    "crmLeads",
    tenantId,
    days,
    isAsesor,
    teamMemberId,
    userId,
  ], fetchLeads, {
    staleTime: 60_000, // 1 min
    cacheTime: 300_000, // 5 min
    refetchOnWindowFocus: true,
    refetchOnMount: false,
  });

  return result;
}
