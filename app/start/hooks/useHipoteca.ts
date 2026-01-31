import { useState, useCallback } from "react";
import { CalculoHipoteca, FormData, Metrics } from "../types";
import { INITIAL_CALCULO_HIPOTECA, INITIAL_METRICS } from "../constants";
import { calcularHipoteca } from "../utils";

export function useHipoteca() {
  const [calculoHipoteca, setCalculoHipoteca] = useState<CalculoHipoteca>(INITIAL_CALCULO_HIPOTECA);
  const [metrics, setMetrics] = useState<Metrics>(INITIAL_METRICS);

  const calcularHipotecaCompleto = useCallback((formData: FormData) => {
    const resultado = calcularHipoteca(
      formData.ingresoMensual,
      formData.valorVivienda,
      formData.plazoAnios,
      formData.tieneDeudas
    );

    setCalculoHipoteca(resultado);

    setMetrics({
      score: resultado.score,
      viability: resultado.aprobado ? "ALTA" : resultado.score >= 70 ? "MEDIA" : "BAJA",
      roi: Math.round(resultado.prestamoAprobable * 0.3)
    });

    return resultado;
  }, []);

  const resetHipoteca = useCallback(() => {
    setCalculoHipoteca(INITIAL_CALCULO_HIPOTECA);
    setMetrics(INITIAL_METRICS);
  }, []);

  const updateCalculoManual = useCallback((updates: Partial<CalculoHipoteca>) => {
    setCalculoHipoteca((prev) => ({ ...prev, ...updates }));
    
    if (updates.score !== undefined || updates.aprobado !== undefined) {
      setMetrics((prev) => ({
        ...prev,
        score: updates.score ?? prev.score,
        viability: updates.aprobado ? "ALTA" : (updates.score ?? prev.score) >= 70 ? "MEDIA" : "BAJA"
      }));
    }
  }, []);

  return {
    calculoHipoteca,
    metrics,
    calcularHipotecaCompleto,
    resetHipoteca,
    updateCalculoManual,
    setMetrics
  };
}