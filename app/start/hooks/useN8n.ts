import { useState, useCallback } from "react";
import { N8nStatus, N8nStats } from "../types";
import { INITIAL_N8N_STATS } from "../constants";
import { nowStamp } from "../utils";

export function useN8n() {
  const [n8nWebhookURL, setN8nWebhookURL] = useState("");
  const [useRealN8n, setUseRealN8n] = useState(false);
  const [n8nStatus, setN8nStatus] = useState<N8nStatus>("disconnected");
  const [n8nStats, setN8nStats] = useState<N8nStats>(INITIAL_N8N_STATS);

  const enviarAccionAn8n = useCallback(
    async (
      tipo: string,
      payload: any
    ): Promise<{ ok: boolean; data?: any; error?: string }> => {
      const url = (n8nWebhookURL || "").trim();
      if (!url) {
        return {
          ok: false,
          error: "Falta configurar la URL del webhook de n8n (pestaña n8n-config)."
        };
      }

      setN8nStatus("testing");

      try {
        const bodyData = {
          tipo,
          timestamp: new Date().toISOString(),
          source: "botz_efiteca",
          ...payload
        };

        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Botz-Source": "botz"
          },
          body: JSON.stringify(bodyData)
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        const data = await res.json().catch(() => ({}));

        setN8nStats((prev) => ({
          ...prev,
          [tipo === "nuevo_lead" ? "leadsEnviados" : "mensajesProcesados"]:
            prev[tipo === "nuevo_lead" ? "leadsEnviados" : "mensajesProcesados"] + 1,
          ultimoEnvio: nowStamp()
        }));

        setN8nStatus("connected");
        return { ok: true, data };
      } catch (error: any) {
        setN8nStats((prev) => ({
          ...prev,
          errores: prev.errores + 1
        }));

        setN8nStatus("disconnected");

        return {
          ok: false,
          error:
            error?.message ||
            "Error conectando con n8n. Verifica la URL y que el webhook esté activo."
        };
      }
    },
    [n8nWebhookURL]
  );

  const testN8nConnection = useCallback(async () => {
    if (!n8nWebhookURL.trim()) {
      return {
        ok: false,
        error: "Por favor, ingresa la URL de tu webhook de n8n primero."
      };
    }

    const result = await enviarAccionAn8n("test_conexion", {
      mensaje: "Test de conexión desde Botz Demo",
      timestamp: new Date().toISOString()
    });

    if (result.ok) {
      setUseRealN8n(true);
    } else {
      setUseRealN8n(false);
    }

    return result;
  }, [n8nWebhookURL, enviarAccionAn8n]);

  const resetN8n = useCallback(() => {
    setUseRealN8n(false);
    setN8nWebhookURL("");
    setN8nStatus("disconnected");
    setN8nStats(INITIAL_N8N_STATS);
  }, []);

  return {
    n8nWebhookURL,
    setN8nWebhookURL,
    useRealN8n,
    setUseRealN8n,
    n8nStatus,
    n8nStats,
    enviarAccionAn8n,
    testN8nConnection,
    resetN8n
  };
}