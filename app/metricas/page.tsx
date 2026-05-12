import type { Metadata } from "next";
import { MetrocasLanding } from "@/app/metrocas/ui/MetrocasLanding";

export const metadata: Metadata = {
  title: "Metricas Intelligence | Analisis de ventas e inventario con IA",
  description:
    "Plataforma de inteligencia comercial con IA para analizar ventas, inventario, clientes y productos desde Excel, Odoo o CRM.",
};

export default function MetricasPage() {
  return <MetrocasLanding />;
}
