"use client";
import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle, Lock, CreditCard } from "lucide-react";

export default function PaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan") || "Agencia Growth";

  const [loading, setLoading] = useState(false);
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");

  // ✅ Tus links de Stripe (TEST)
  // Cuando pases a LIVE, reemplazas por los links LIVE (sin test_)
  const STRIPE_LINKS = {
    basic: "https://buy.stripe.com/test_3cI4gs9E9e9S4RVgNEfrW01",
    growth: "https://buy.stripe.com/test_fZu5kwg2x7Lu0BF2W0frW00",
  };

  // Precios simulados (solo para mostrar en tu UI)
  const prices: Record<string, number> = {
    "Agente Solo": 49,
    "Agencia Growth": 149,
    "Enterprise": 999,
  };

  const amount = prices[plan] || 149;

  // ✅ Detecta plan y devuelve el link correcto
  const getStripeLinkForPlan = (planName: string) => {
    const p = (planName || "").toLowerCase();

    // Si tu web usa otros nombres, agrégalos aquí
    if (p.includes("growth")) return STRIPE_LINKS.growth;
    if (p.includes("básic") || p.includes("basico") || p.includes("agente")) return STRIPE_LINKS.basic;

    // Enterprise / otros: manda a pricing (o contact sales)
    return "";
  };

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const url = getStripeLinkForPlan(plan);

    if (!url) {
      // Si el plan no tiene link, te mando a pricing (o cambia por un mensaje)
      router.push("/pricing");
      return;
    }

    // ✅ Redirección a Stripe (sin guardar "hasPaid" porque Stripe es quien cobra)
    window.location.href = url;
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white flex items-center justify-center p-4 font-sans">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* RESUMEN DE LA ORDEN */}
        <div className="bg-[#1e293b] p-8 rounded-2xl border border-white/10">
          <h2 className="text-xl font-bold mb-6">Resumen del Pedido</h2>

          <div className="flex justify-between items-center mb-4 pb-4 border-b border-white/10">
            <div>
              <div className="font-bold text-lg">{plan}</div>
              <div className="text-sm text-gray-400">Suscripción Mensual</div>
            </div>
            <div className="font-bold text-xl">${amount}.00</div>
          </div>

          <div className="flex justify-between items-center mb-8">
            <span className="text-gray-400">Total a pagar hoy:</span>
            <span className="text-2xl font-bold text-[#22d3ee]">${amount}.00</span>
          </div>

          <div className="bg-[#22d3ee]/10 p-4 rounded-lg flex gap-3 items-start">
            <CheckCircle className="text-[#22d3ee] shrink-0" size={20} />
            <div className="text-sm text-gray-300">
              <span className="font-bold text-white">Garantía de 7 días.</span>{" "}
              Si no cierras ningún lead en tu primera semana, te devolvemos el dinero.
            </div>
          </div>
        </div>

        {/* FORMULARIO DE PAGO */}
        <div className="bg-white text-gray-900 p-8 rounded-2xl shadow-2xl">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <CreditCard size={20} /> Detalles de Pago
          </h2>

          <form onSubmit={handlePay} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                Titular de la tarjeta
              </label>
              <input
                type="text"
                required
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#22d3ee] outline-none"
                placeholder="Juan Pérez"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                Número de Tarjeta
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#22d3ee] outline-none"
                  placeholder="0000 0000 0000 0000"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                />
                <div className="absolute right-3 top-3 opacity-50">
                  <Lock size={16} />
                </div>
              </div>

              {/* ✅ Nota: estos campos son solo visuales.
                  El pago real se hace en Stripe Checkout (Payment Link). */}
              <div className="mt-2 text-[11px] text-gray-500">
                *Los datos reales de pago se ingresan en Stripe al continuar.
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Expiración
                </label>
                <input
                  type="text"
                  placeholder="MM/YY"
                  className="w-full p-3 border border-gray-300 rounded-lg outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  CVC
                </label>
                <input
                  type="text"
                  placeholder="123"
                  className="w-full p-3 border border-gray-300 rounded-lg outline-none"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-4 w-full bg-[#0f172a] text-white font-bold py-4 rounded-lg hover:bg-[#1e293b] transition flex items-center justify-center gap-2"
            >
              {loading ? "Redirigiendo a Stripe..." : `Pagar $${amount}.00`}
            </button>

            <div className="text-center text-xs text-gray-400 mt-2 flex items-center justify-center gap-1">
              <Lock size={12} /> Pagos seguros encriptados con SSL de 256-bits via Stripe.
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
