"use client";

import React, { useState, useEffect } from "react";
import { X, Clock } from "lucide-react";

interface DemoTrialBannerProps {
  trialEndDate: string | Date;
  onClose?: () => void;
}

export default function DemoTrialBanner({ trialEndDate, onClose }: DemoTrialBannerProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
  } | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const endDate = new Date(trialEndDate);
      const now = new Date();
      const diff = endDate.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0 });
        setIsUrgent(true);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);

      setTimeLeft({ days, hours, minutes });
      setIsUrgent(days === 0); // Último día
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 60000); // Actualizar cada minuto

    return () => clearInterval(interval);
  }, [trialEndDate]);

  if (!isVisible || !timeLeft) return null;

  const bgGradient = isUrgent
    ? "linear-gradient(90deg, rgba(127, 29, 29, 0.3) 0%, rgba(153, 27, 27, 0.15) 100%)"
    : "linear-gradient(90deg, rgba(120, 53, 15, 0.3) 0%, rgba(146, 64, 14, 0.15) 100%)";

  const borderColor = isUrgent ? "border-red-600/50" : "border-yellow-600/50";
  const textColor = isUrgent ? "text-red-300" : "text-yellow-300";
  const iconColor = isUrgent ? "text-red-400" : "text-yellow-400";
  const timeLeftText =
    timeLeft.days > 0
      ? `${timeLeft.days} día${timeLeft.days > 1 ? "s" : ""}`
      : `${timeLeft.hours} hora${timeLeft.hours !== 1 ? "s" : ""} ${timeLeft.minutes} minuto${timeLeft.minutes !== 1 ? "s" : ""}`;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 border-b ${borderColor}`}
      style={{
        background: bgGradient,
        backdropFilter: "blur(4px)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 flex-1">
          <Clock className={`w-5 h-5 flex-shrink-0 ${iconColor}`} />
          <div>
            <p className={`text-sm font-semibold ${textColor}`}>
              ⏰ Tu acceso de prueba termina en {timeLeftText}
            </p>
            <p className={`text-xs ${textColor} opacity-75`}>
              Fecha: {new Date(trialEndDate).toLocaleString("es-ES", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setIsVisible(false);
            onClose?.();
          }}
          className={`p-1 rounded hover:bg-black/20 transition-colors ${textColor} flex-shrink-0`}
          title="Cerrar"
          aria-label="Cerrar aviso"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
