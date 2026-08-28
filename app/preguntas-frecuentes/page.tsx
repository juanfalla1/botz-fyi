import type { Metadata } from "next";
import FAQExperience from "./FAQExperience";

export const metadata: Metadata = {
  title: "Preguntas frecuentes | BOTZ",
  description: "Respuestas sobre implementacion, integraciones, seguridad, soporte, personalizacion y escalabilidad de las soluciones BOTZ.",
  alternates: { canonical: "/preguntas-frecuentes" },
};

export default function FAQPage() {
  return <FAQExperience />;
}
