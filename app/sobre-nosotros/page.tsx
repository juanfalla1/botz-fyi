import type { Metadata } from "next";
import AboutExperience from "./AboutExperience";

export const metadata: Metadata = {
  title: "Sobre BOTZ | Estrategia, automatizacion e IA",
  description: "Conoce al equipo, la metodologia y la vision con la que BOTZ convierte procesos empresariales en operaciones inteligentes.",
  alternates: { canonical: "/sobre-nosotros" },
};

export default function AboutPage() {
  return <AboutExperience />;
}
