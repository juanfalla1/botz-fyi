import { getServiceSupabase } from "@/app/api/_utils/supabase";
import { evolutionService } from "../../../../../../../lib/services/evolution.service";

export type WebhookInfraServices = {
  getSupabase: typeof getServiceSupabase;
  evolution: typeof evolutionService;
};

export const webhookInfraServices: WebhookInfraServices = {
  getSupabase: getServiceSupabase,
  evolution: evolutionService,
};
