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
  async sendTypingPresence(instanceName: string, destination: string): Promise<void> {
    const raw = String(destination || "").trim();
    if (!raw) return;
    const number = raw.includes("@") ? raw : raw.replace(/\D/g, "");
    if (!number) return;

    const bodies = [
      { number, status: "composing" },
      { number, presence: "composing" },
      { number, type: "composing" },
      { jid: number, status: "composing" },
      { jid: number, presence: "composing" },
    ];
    const paths = [
      `/chat/sendPresence/${instanceName}`,
      `/chat/presence/${instanceName}`,
      `/message/sendPresence/${instanceName}`,
      `/message/presence/${instanceName}`,
    ];

    let ok = false;
    for (const p of paths) {
      for (const b of bodies) {
        try {
          await evolutionFetch(p, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(b),
          });
          ok = true;
          break;
        } catch {
          continue;
        }
      }
      if (ok) break;
    }
  }

  async sendTypingPresenceBatch(instanceName: string, destinations: string[]): Promise<void> {
    const unique = (destinations || [])
      .map((d) => String(d || "").trim())
      .filter((d, i, arr) => d && arr.indexOf(d) === i)
      .slice(0, 3);
    for (const d of unique) {
      try {
        await this.sendTypingPresence(instanceName, d);
      } catch {
        continue;
      }
    }
  }

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
    console.log("[evolutionService] sendMessage", { instanceName, number, messageLength: message.length });

    try {
      const result = await evolutionFetch(`/message/sendText/${instanceName}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number, text: message }),
      });
      console.log("[evolutionService] sendMessage success", { instanceName, number, result });
      return result;
    } catch (err: any) {
      console.error("[evolutionService] sendMessage error", { instanceName, number, error: err?.message });
      throw err;
    }
  }

  async sendMessageToJid(instanceName: string, jid: string, message: string): Promise<any> {
    const destination = String(jid || "").trim();
    if (!destination.includes("@")) {
      throw new Error("Invalid JID destination");
    }
    console.log("[evolutionService] sendMessageToJid", { instanceName, jid: destination, messageLength: message.length });

    try {
      const result = await evolutionFetch(`/message/sendText/${instanceName}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: destination, text: message }),
      });
      console.log("[evolutionService] sendMessageToJid success", { instanceName, jid: destination, result });
      return result;
    } catch (errA: any) {
      const firstError = String(errA?.message || "");
      try {
        const result = await evolutionFetch(`/message/sendText/${instanceName}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jid: destination, text: message }),
        });
        console.log("[evolutionService] sendMessageToJid success_fallback", { instanceName, jid: destination, result });
        return result;
      } catch (errB: any) {
        console.error("[evolutionService] sendMessageToJid error", {
          instanceName,
          jid: destination,
          firstError,
          error: errB?.message,
        });
        throw errB;
      }
    }
  }

  async sendDocument(
    instanceName: string,
    phone: string,
    args: { base64: string; fileName: string; caption?: string; mimetype?: string }
  ): Promise<any> {
    const destinationRaw = String(phone || "").trim();
    const number = destinationRaw.replace(/\D/g, "");
    const hasJid = destinationRaw.includes("@");
    const fileName = String(args?.fileName || "cotizacion.pdf").trim() || "cotizacion.pdf";
    const caption = String(args?.caption || "").trim();
    const mimetype = String(args?.mimetype || "application/pdf").trim() || "application/pdf";
    const rawBase64 = String(args?.base64 || "").trim();
    const base64Only = rawBase64.startsWith("data:")
      ? (rawBase64.split(",")[1] || "").trim()
      : rawBase64;
    const mediaDataUrl = rawBase64.startsWith("data:") ? rawBase64 : `data:${mimetype};base64,${base64Only}`;

    console.log("[evolutionService] sendDocument", {
      instanceName,
      number,
      destinationRaw,
      hasJid,
      fileName,
      captionLength: caption.length,
      mediaChars: mediaDataUrl.length,
    });

    const destinationShapes: Array<Record<string, any>> = [];
    if (hasJid) {
      destinationShapes.push({ number: destinationRaw });
      destinationShapes.push({ jid: destinationRaw });
    }
    if (number) {
      destinationShapes.push({ number });
      destinationShapes.push({ jid: `${number}@s.whatsapp.net` });
    }

    const uniqueShapes = destinationShapes.filter((v, i, arr) => {
      const key = JSON.stringify(v);
      return arr.findIndex((x) => JSON.stringify(x) === key) === i;
    });

    const attempts: Array<{ body: any; tag: string }> = [];
    for (const dst of uniqueShapes) {
      attempts.push(
        {
          tag: `sendMedia_media_base64Only_${Object.keys(dst)[0]}`,
          body: {
            ...dst,
            mediatype: "document",
            mimetype,
            fileName,
            caption,
            media: base64Only,
          },
        },
        {
          tag: `sendMedia_file_base64Only_${Object.keys(dst)[0]}`,
          body: {
            ...dst,
            mediatype: "document",
            mimetype,
            fileName,
            caption,
            file: base64Only,
          },
        },
        {
          tag: `sendMedia_base64_base64Only_${Object.keys(dst)[0]}`,
          body: {
            ...dst,
            mediatype: "document",
            mimetype,
            fileName,
            caption,
            base64: base64Only,
          },
        },
        {
          tag: `sendMedia_media_dataUrl_${Object.keys(dst)[0]}`,
          body: {
            ...dst,
            mediatype: "document",
            mimetype,
            fileName,
            caption,
            media: mediaDataUrl,
          },
        },
        {
          tag: `sendMedia_file_dataUrl_${Object.keys(dst)[0]}`,
          body: {
            ...dst,
            mediatype: "document",
            mimetype,
            fileName,
            caption,
            file: mediaDataUrl,
          },
        },
        {
          tag: `sendMedia_base64_dataUrl_${Object.keys(dst)[0]}`,
          body: {
            ...dst,
            mediatype: "document",
            mimetype,
            fileName,
            caption,
            base64: mediaDataUrl,
          },
        }
      );
    }

    let lastErr: any = null;
    for (const att of attempts) {
      try {
        const result = await evolutionFetch(`/message/sendMedia/${instanceName}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(att.body),
        });
        console.log("[evolutionService] sendDocument success", { instanceName, number, attempt: att.tag, result });
        return result;
      } catch (e: any) {
        lastErr = e;
      }
    }

    console.error("[evolutionService] sendDocument error", {
      instanceName,
      number,
      error: lastErr?.message,
    });
    throw lastErr || new Error("sendDocument failed");
  }

  async sendImage(
    instanceName: string,
    phone: string,
    args: { base64: string; fileName?: string; caption?: string; mimetype?: string }
  ): Promise<any> {
    const destinationRaw = String(phone || "").trim();
    const number = destinationRaw.replace(/\D/g, "");
    const hasJid = destinationRaw.includes("@");
    const fileName = String(args?.fileName || "imagen.jpg").trim() || "imagen.jpg";
    const caption = String(args?.caption || "").trim();
    const mimetype = String(args?.mimetype || "image/jpeg").trim() || "image/jpeg";
    const rawBase64 = String(args?.base64 || "").trim();
    const base64Only = rawBase64.startsWith("data:")
      ? (rawBase64.split(",")[1] || "").trim()
      : rawBase64;
    const mediaDataUrl = rawBase64.startsWith("data:") ? rawBase64 : `data:${mimetype};base64,${base64Only}`;

    const destinationShapes: Array<Record<string, any>> = [];
    if (hasJid) {
      destinationShapes.push({ number: destinationRaw });
      destinationShapes.push({ jid: destinationRaw });
    }
    if (number) {
      destinationShapes.push({ number });
      destinationShapes.push({ jid: `${number}@s.whatsapp.net` });
    }

    const uniqueShapes = destinationShapes.filter((v, i, arr) => {
      const key = JSON.stringify(v);
      return arr.findIndex((x) => JSON.stringify(x) === key) === i;
    });

    const attempts: Array<{ body: any }> = [];
    for (const dst of uniqueShapes) {
      attempts.push(
        { body: { ...dst, mediatype: "image", fileName, caption, mimetype, media: base64Only } },
        { body: { ...dst, mediatype: "image", fileName, caption, mimetype, file: base64Only } },
        { body: { ...dst, mediatype: "image", fileName, caption, mimetype, base64: base64Only } },
        { body: { ...dst, mediatype: "image", fileName, caption, mimetype, media: mediaDataUrl } },
        { body: { ...dst, mediatype: "image", fileName, caption, mimetype, file: mediaDataUrl } },
        { body: { ...dst, mediatype: "image", fileName, caption, mimetype, base64: mediaDataUrl } }
      );
    }

    let lastErr: any = null;
    for (const att of attempts) {
      try {
        return await evolutionFetch(`/message/sendMedia/${instanceName}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(att.body),
        });
      } catch (e: any) {
        lastErr = e;
      }
    }

    throw lastErr || new Error("sendImage failed");
  }

  async disconnect(instanceName: string): Promise<void> {
    await evolutionFetch(`/instance/logout/${instanceName}`, { method: "DELETE" });
  }
}

export const evolutionService = new EvolutionService();
