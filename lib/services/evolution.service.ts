// lib/services/evolution.service.ts

/**
 * Evolution API helper
 *
 * Notas importantes (según tu servidor):
 * - La autenticación usa el header:  apikey: <AUTHENTICATION_API_KEY>
 * - En tu instancia existente se ve: integration = "WHATSAPP-BAILEYS"
 */

const EVOLUTION_URL = String(process.env.EVOLUTION_API_URL || "")
  .trim()
  .replace(/\/+$/, "");

const EVOLUTION_API_KEY = String(process.env.EVOLUTION_API_KEY || "").trim();

function evolutionHeaders(extra?: Record<string, string>) {
  if (!EVOLUTION_URL) throw new Error("EVOLUTION_API_URL missing");
  if (!EVOLUTION_API_KEY) throw new Error("EVOLUTION_API_KEY missing");
  return { apikey: EVOLUTION_API_KEY, ...extra };
}

async function readTextSafe(res: Response) {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

function tryJson(raw: string) {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function normalizeEvolutionError(raw: any) {
  // Tu API a veces devuelve {status, error, response:{message:...}}
  // y otras veces devuelve el string JSON anidado.
  const msg = raw?.response?.message ?? raw?.message ?? raw;
  if (typeof msg === "string") {
    const j = tryJson(msg);
    return j ?? msg;
  }
  return msg;
}

async function evolutionFetch(path: string, init: RequestInit = {}) {
  const url = `${EVOLUTION_URL}${path.startsWith("/") ? path : `/${path}`}`;

  const res = await fetch(url, {
    ...init,
    headers: evolutionHeaders((init.headers as Record<string, string>) || {}),
  });

  const raw = await readTextSafe(res);
  const json = tryJson(raw);

  if (!res.ok) {
    const parsed = normalizeEvolutionError(json ?? raw);

    throw new Error(
      `Evolution API error: ${JSON.stringify({
        status: res.status,
        error: res.statusText || "Request failed",
        response: { message: parsed ?? "Request failed" },
        url,
      })}`
    );
  }

  return json ?? raw;
}

export class EvolutionService {
  async fetchInstances(): Promise<any[]> {
    const data = await evolutionFetch("/instance/fetchInstances", { method: "GET" });

    // Puede venir como array o como objeto único
    if (Array.isArray(data)) return data;
    if (data && typeof data === "object" && (data.id || data.name)) return [data];
    return [];
  }

  private async findInstanceByName(instanceName: string): Promise<any | null> {
    const instances = await this.fetchInstances();
    const found = instances.find(
      (i: any) => String(i?.name || "").toLowerCase() === String(instanceName).toLowerCase()
    );
    return found || null;
  }

  async createInstance(tenantId: string): Promise<any> {
    const instanceName = `tenant_${tenantId}`;

    try {
      // IMPORTANTE: tu servidor requiere integration (si no -> "Invalid integration")
      return await evolutionFetch("/instance/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instanceName,
          token: tenantId,
          qrcode: true,
          integration: "WHATSAPP-BAILEYS",
        }),
      });
    } catch (e: any) {
      const msg = String(e?.message || "");

      // Si ya existe el nombre, tu API devuelve 403 con "already in use"
      if (msg.includes("already in use") || msg.includes("is already in use")) {
        const existing = await this.findInstanceByName(instanceName);
        if (existing) return existing;
      }

      throw e;
    }
  }

  async getStatus(instanceName: string): Promise<"connected" | "pending" | "disconnected"> {
    try {
      const found = await this.findInstanceByName(instanceName);
      if (!found) return "disconnected";

      const cs = String(found?.connectionStatus || found?.status || "").toLowerCase();
      if (cs === "open" || cs === "connected") return "connected";
      if (cs === "connecting" || cs === "qrcode" || cs === "pending") return "pending";
      return "disconnected";
    } catch {
      return "disconnected";
    }
  }

  async getQRCode(instanceName: string): Promise<string | null> {
    // OJO: Si la instancia no existe, tu API devuelve 404. Aquí devolvemos null.
    try {
      const data: any = await evolutionFetch(`/instance/connect/${instanceName}`, { method: "GET" });
      return data?.qrcode?.base64 || data?.qrcode || data?.base64 || null;
    } catch (e: any) {
      const msg = String(e?.message || "");
      if (msg.includes("status\":404") || msg.includes("does not exist")) return null;
      throw e;
    }
  }

  async sendMessage(instanceName: string, phone: string, message: string): Promise<any> {
    const number = String(phone || "").replace(/\D/g, "");

    return await evolutionFetch(`/message/sendText/${instanceName}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ number, text: message }),
    });
  }

  async disconnect(instanceName: string): Promise<void> {
    await evolutionFetch(`/instance/logout/${instanceName}`, { method: "DELETE" });
  }
}

export const evolutionService = new EvolutionService();
