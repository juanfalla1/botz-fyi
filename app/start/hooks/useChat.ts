import { useState, useRef, useCallback } from "react";
import { ChatMsg, Pending, FormData, CalculoHipoteca, CRMState } from "../types";
import { TIMING } from "../constants";

export function useChat() {
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [draft, setDraft] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [pending, setPending] = useState<Pending>(null);

  const followupTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastUserMsgAtRef = useRef<number>(0);

  const pushBot = useCallback((text: string, delay = 900) => {
    setIsTyping(true);

    setTimeout(() => {
      setChat((prev) => [...prev, { role: "bot", text }]);
      setIsTyping(false);
    }, delay);
  }, []);

  const pushUser = useCallback((text: string) => {
    lastUserMsgAtRef.current = Date.now();
    setChat((prev) => [...prev, { role: "user", text }]);
  }, []);

  const clearFollowupTimer = useCallback(() => {
    if (followupTimeoutRef.current) {
      clearTimeout(followupTimeoutRef.current);
      followupTimeoutRef.current = null;
    }
  }, []);

  const scheduleFollowupIfNoReply = useCallback(
    (onFollowup: () => void) => {
      clearFollowupTimer();
      const scheduledAt = Date.now();

      followupTimeoutRef.current = setTimeout(() => {
        if (lastUserMsgAtRef.current > scheduledAt) return;
        onFollowup();
      }, TIMING.followUpIfNoReply);
    },
    [clearFollowupTimer]
  );

  const resetChat = useCallback(() => {
    setChat([]);
    setDraft("");
    setIsTyping(false);
    setPending(null);
    clearFollowupTimer();
    lastUserMsgAtRef.current = 0;
  }, [clearFollowupTimer]);

  const processMessage = useCallback(
    async (
      message: string,
      context: {
        formData: FormData;
        calculoHipoteca: CalculoHipoteca;
        crm: CRMState;
        onUpdateCRM: (stage: string, nextAction: string) => void;
        onAddMeeting: (meeting: any) => void;
        onAddEmail: (email: any) => void;
        onSetStep: (step: number) => void;
      }
    ): Promise<string> => {
      const m = message.toLowerCase();
      const { formData, calculoHipoteca, onUpdateCRM, onAddMeeting, onAddEmail, onSetStep } = context;

      // Reunión
      if (pending?.kind === "meeting_pick") {
        const wantsDayAfter = m.includes("pasado");
        const wantsAfternoon = m.includes("tarde") || m.includes("pm");

        const dayText = wantsDayAfter ? "Pasado mañana" : "Mañana";
        const timeText = wantsAfternoon ? "4:00 PM" : "10:00 AM";
        const when = `${dayText} — ${timeText}`;

        setPending(null);
        onSetStep(11);
        onUpdateCRM("Reunión agendada", "Preparar propuesta");

        onAddMeeting({
          when,
          title: `Reunión Hipotecaria — ${formData.name}`,
          status: "Confirmada",
          notes: `Préstamo: $${calculoHipoteca.prestamoAprobable.toLocaleString()} | Estado: ${calculoHipoteca.aprobado ? "Pre-aprobado" : "En revisión"} | Score: ${calculoHipoteca.score}/100`
        });

        onAddEmail({
          to: formData.email,
          subject: `Reunión confirmada — Análisis Hipotecario`,
          tag: "Agenda",
          body:
            `Hola ${formData.name},\n\n` +
            `Reunión confirmada para análisis hipotecario:\n` +
            `• Cuándo: ${when}\n` +
            `• Préstamo analizado: $${calculoHipoteca.prestamoAprobable.toLocaleString()}\n` +
            `• Estado actual: ${calculoHipoteca.aprobado ? "Pre-aprobado" : "En revisión"}\n\n` +
            `Objetivo: revisar documentación y definir pasos finales.\n\n` +
            `— Botz Hipotecario`
        });

        return `Perfecto ✅ Reunión agendada: ${when}.\n\n¿Quieres que te prepare la documentación necesaria antes de la reunión?`;
      }

      // Propuesta
      if (pending?.kind === "proposal_clarify") {
        setPending(null);
        onSetStep(12);
        onUpdateCRM("Propuesta enviada", "Esperando OK del lead");

        onAddEmail({
          to: formData.email,
          subject: `Propuesta Hipotecaria — $${calculoHipoteca.prestamoAprobable.toLocaleString()}`,
          tag: "Propuesta",
          body:
            `Hola ${formData.name},\n\n` +
            `Propuesta hipotecaria detallada:\n\n` +
            `• Monto: $${calculoHipoteca.prestamoAprobable.toLocaleString()}\n` +
            `• Cuota: $${calculoHipoteca.cuotaEstimada}/mes\n` +
            `• Tasa: ${calculoHipoteca.tasa.toFixed(2)}% anual\n` +
            `• Plazo: ${calculoHipoteca.plazo} años\n` +
            `• DTI: ${calculoHipoteca.dti}%\n` +
            `• LTV: ${calculoHipoteca.ltv}%\n\n` +
            `Detalle adicional: ${message}\n\n` +
            `Si estás de acuerdo, responde "listo" y lo confirmamos.\n\n` +
            `— Botz Hipotecario`
        });

        return 'Listo ✅ Ya preparé la propuesta hipotecaria y la dejé en tu correo. Si estás OK, responde "listo" y confirmamos.';
      }

      // Confirmación final
      if (pending?.kind === "final_confirm_email") {
        if (m.includes("sí") || m.includes("si") || m.includes("listo") || m.includes("ok") || m.includes("confirm")) {
          setPending(null);
          onSetStep(13);
          onUpdateCRM("Confirmado (Listo para iniciar)", "Onboarding / bienvenida");

          onAddEmail({
            to: formData.email,
            subject: `Confirmación final — Préstamo Hipotecario`,
            tag: "Confirmación",
            body:
              `Hola ${formData.name},\n\n` +
              `Confirmación ✅\n\n` +
              `Tu solicitud hipotecaria ha sido confirmada.\n` +
              `Monto: $${calculoHipoteca.prestamoAprobable.toLocaleString()}\n` +
              `Próximo paso: recolección de documentación y firma.\n\n` +
              `— Botz Hipotecario`
          });

          return "Excelente 🎉 Confirmado. Te envié la confirmación final al correo. ¿Quieres que te muestre los documentos necesarios para continuar?";
        }

        return `Para confirmar solo responde: "sí". (Correo destino: ${formData.email})`;
      }

      // Hipoteca detalles
      if (pending?.kind === "hipoteca_detalles") {
        setPending(null);
        return "Gracias por los detalles. He actualizado tu perfil y continuamos con el análisis. ¿Te gustaría ver las opciones de tasa que tenemos disponibles?";
      }

      // Comandos generales
      if (m.includes("hipoteca") || m.includes("préstamo") || m.includes("crédito") || m.includes("calcular")) {
        setPending({ kind: "hipoteca_detalles" });
        return (
          `Perfecto, veo que ya tenemos tu cálculo:\n\n` +
          `• Préstamo: $${calculoHipoteca.prestamoAprobable.toLocaleString()}\n` +
          `• Cuota: $${calculoHipoteca.cuotaEstimada}/mes\n` +
          `• Estado: ${calculoHipoteca.aprobado ? "Pre-aprobado" : "En revisión"}\n\n` +
          `¿Hay algún detalle específico que quieras ajustar?`
        );
      }

      if (m.includes("dti") || m.includes("ltv") || m.includes("ratio") || m.includes("endeudamiento")) {
        return (
          `Tus ratios actuales:\n\n` +
          `• DTI (Debt-to-Income): ${calculoHipoteca.dti}% (límite: 35%)\n` +
          `• LTV (Loan-to-Value): ${calculoHipoteca.ltv}% (límite: 80%)\n` +
          `• Score: ${calculoHipoteca.score}/100\n\n` +
          `¿Quieres saber cómo mejorar estos ratios?`
        );
      }

      if (m.includes("document") || m.includes("papel") || m.includes("requisito")) {
        return (
          `Documentación requerida:\n\n` +
          `1. Identificación oficial\n` +
          `2. Comprobantes de ingresos (3 meses)\n` +
          `3. Estados de cuenta bancarios\n` +
          `4. Historial crediticio\n` +
          `5. Información de la propiedad\n\n` +
          `¿Necesitas ayuda con algún documento específico?`
        );
      }

      if (m.includes("reun") || m.includes("agenda") || m.includes("llamad") || m.includes("meeting")) {
        onSetStep(11);
        setPending({ kind: "meeting_pick" });
        onUpdateCRM("Seguimiento", "Confirmar fecha y hora");
        return "Perfecto. Agendemos una reunión para revisar tu hipoteca ✅\nDime: ¿mañana o pasado? ¿en la mañana o en la tarde?";
      }

      if (m.includes("precio") || m.includes("propuesta") || m.includes("plan") || m.includes("cotiz") || m.includes("cuánto") || m.includes("oferta")) {
        onSetStep(12);
        setPending({ kind: "proposal_clarify" });
        onUpdateCRM("Seguimiento", "Aclarar detalles para propuesta");
        return "Listo. Te preparo la propuesta hipotecaria completa ✅\n¿Prefieres una tasa fija o variable? ¿Algún plazo específico en mente?";
      }

      if (m.includes("listo") || m.includes("ok") || m.includes("dale") || m.includes("vamos") || m.includes("acepto") || m.includes("confirm")) {
        setPending({ kind: "final_confirm_email" });
        return `Perfecto ✅ Para confirmar tu hipoteca: ¿te envío el correo final a ${formData.email}? Responde: "sí".`;
      }

      if (m.includes("que sigue") || m.includes("qué sigue") || m.includes("siguiente") || m.includes("proceso")) {
        return "Sigue esto: 1) revisar documentación, 2) reunión de análisis, 3) propuesta formal, 4) confirmación y firma.";
      }

      // Respuesta por defecto
      return (
        `Perfecto. Ya tengo tu perfil hipotecario:\n` +
        `• Ingresos: $${calculoHipoteca.ingresosMensuales}/mes\n` +
        `• Vivienda: $${calculoHipoteca.valorVivienda.toLocaleString()}\n` +
        `• Préstamo: $${calculoHipoteca.prestamoAprobable.toLocaleString()}\n` +
        `• Estado: ${calculoHipoteca.aprobado ? "Pre-aprobado" : "En revisión"}\n\n` +
        `¿En qué te puedo ayudar específicamente con tu hipoteca?`
      );
    },
    [pending]
  );

  return {
    chat,
    draft,
    setDraft,
    isTyping,
    pending,
    setPending,
    pushBot,
    pushUser,
    clearFollowupTimer,
    scheduleFollowupIfNoReply,
    resetChat,
    processMessage
  };
}