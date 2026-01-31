import { useState, useRef, useCallback } from "react";
import { Popup } from "../types";
import { generateUniqueId } from "../utils";
import { TIMING } from "../constants";

export function usePopups() {
  const [popups, setPopups] = useState<Popup[]>([]);
  const autoRemoveTimeoutsRef = useRef<{ [key: string]: NodeJS.Timeout }>({});

  const addPopup = useCallback((popup: Omit<Popup, "id">) => {
    const id = generateUniqueId("popup");
    const newPopup = { ...popup, id };

    setPopups((prev) => [...prev, newPopup]);

    if (popup.autoRemove && popup.autoRemoveTime) {
      autoRemoveTimeoutsRef.current[id] = setTimeout(() => {
        removePopup(id);
      }, popup.autoRemoveTime);
    }

    return id;
  }, []);

  const removePopup = useCallback((id: string) => {
    if (autoRemoveTimeoutsRef.current[id]) {
      clearTimeout(autoRemoveTimeoutsRef.current[id]);
      delete autoRemoveTimeoutsRef.current[id];
    }

    setPopups((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const removePopupByStep = useCallback((stepNum: number) => {
    setPopups((prev) => {
      const popupToRemove = prev.find((p) => p.step === stepNum);
      if (popupToRemove) {
        if (autoRemoveTimeoutsRef.current[popupToRemove.id]) {
          clearTimeout(autoRemoveTimeoutsRef.current[popupToRemove.id]);
          delete autoRemoveTimeoutsRef.current[popupToRemove.id];
        }
        return prev.filter((p) => p.id !== popupToRemove.id);
      }
      return prev;
    });
  }, []);

  const clearAllPopups = useCallback(() => {
    Object.values(autoRemoveTimeoutsRef.current).forEach((timeout) => {
      clearTimeout(timeout);
    });
    autoRemoveTimeoutsRef.current = {};
    setPopups([]);
  }, []);

  const showStepExplanation = useCallback(
    (stepNum: number, onContinue: () => void) => {
      const explanations = [
        {
          title: "📝 Paso 1: Formulario Inicial",
          message: "Este formulario captura tu información básica para crear tu perfil como LEAD. No te preocupes, aún no eres cliente, solo estamos registrando tu interés.",
          buttonText: "Entendido, continuar"
        },
        {
          title: "💾 Paso 2: Registro del LEAD",
          message: "Tu información se guarda en nuestro sistema para poder hacer seguimiento. Esto evita que tu solicitud se pierda y nos permite organizar las prioridades.",
          buttonText: "Ver siguiente paso"
        },
        {
          title: "🧠 Paso 3: Entendemos tu Necesidad",
          message: "Analizamos lo que realmente necesitas automatizar. No es magia, es solo organizar la información para ofrecerte una solución precisa.",
          buttonText: "Continuar con el proceso"
        },
        {
          title: "📧 Paso 4: Correo de Bienvenida",
          message: "Te enviamos un correo con todo el resumen. Mira cómo se ilumina el buzón arriba a la izquierda. Este correo queda registrado en nuestro sistema.",
          buttonText: "Ver correo enviado"
        },
        {
          title: "💬 Paso 5: WhatsApp Activado",
          message: "Ahora puedes chatear conmigo como si fuera WhatsApp real. Aquí resolvemos dudas y definimos los próximos pasos.",
          buttonText: "Chatear ahora"
        },
        {
          title: "🏠 Paso 6: Cálculo Hipotecario",
          message: "Calculamos tu capacidad de endeudamiento, cuota mensual estimada y porcentaje de financiación. Usamos DTI (Debt-to-Income) y LTV (Loan-to-Value) para evaluar viabilidad.",
          buttonText: "Ver cálculo"
        },
        {
          title: "📊 Paso 7: Criterios de Viabilidad",
          message: "Evaluamos los criterios clave: DTI ≤ 35%, LTV ≤ 80%, historial crediticio y estabilidad laboral. Estos determinan si el préstamo es viable.",
          buttonText: "Ver criterios"
        },
        {
          title: "⭐ Paso 8: Calificación del Lead",
          message: "Asignamos un puntaje basado en: perfil del cliente, documentación completa, capacidad de pago y nivel de riesgo. Puntaje de 0 a 100.",
          buttonText: "Ver calificación"
        },
        {
          title: "✅ Paso 9: Análisis de Aprobación",
          message: "Decisión final basada en políticas internas, regulaciones y evaluación de riesgo. Se aprueba si cumple todos los criterios y documentación está completa.",
          buttonText: "Ver análisis"
        },
        {
          title: "⏰ Paso 10: Seguimiento Respetuoso",
          message: "Si no respondes, hacemos un seguimiento amable después de un tiempo. No somos insistentes, solo queremos asegurarnos de ayudarte.",
          buttonText: "Entendido"
        },
        {
          title: "📅 Paso 11: Agendar Reunión",
          message: "Si es necesario, agendamos una reunión corta de 15 minutos para aclarar detalles y definir el alcance exacto.",
          buttonText: "Continuar"
        },
        {
          title: "📄 Paso 12: Propuesta Detallada",
          message: "Preparamos una propuesta clara con lo que haremos, tiempos y costos. Todo queda documentado en tu correo.",
          buttonText: "Ver ejemplo de propuesta"
        },
        {
          title: "🎯 Paso 13: Confirmación Final",
          message: "Cuando estés listo, confirmamos y empezamos el proyecto. Solo entonces pasas de LEAD a CLIENTE.",
          buttonText: "Completar proceso"
        }
      ];

      if (stepNum >= 0 && stepNum < explanations.length) {
        const explanation = explanations[stepNum];
        addPopup({
          title: explanation.title,
          message: explanation.message,
          buttonText: explanation.buttonText,
          position: { top: 0, left: 0 },
          step: stepNum,
          showArrow: false,
          action: () => {
            onContinue();
            removePopupByStep(stepNum);
          },
          autoRemove: false,
          autoRemoveTime: TIMING.popupAutoRemove
        });
      }
    },
    [addPopup, removePopupByStep]
  );

  return {
    popups,
    addPopup,
    removePopup,
    removePopupByStep,
    clearAllPopups,
    showStepExplanation
  };
}