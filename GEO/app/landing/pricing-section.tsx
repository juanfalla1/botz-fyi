"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Check, Sparkles, Zap } from "lucide-react"

const plans = [
  {
    name: "Starter",
    description: "Para usuarios individuales",
    price: "29",
    period: "/mes",
    features: [
      "1 marca",
      "10 GEO audits/mes",
      "100 prompts monitoreados",
      "Dashboard básico",
      "Reportes mensuales",
      "Soporte por email"
    ],
    highlighted: false,
    cta: "Comenzar prueba"
  },
  {
    name: "Growth",
    description: "Para equipos en crecimiento",
    price: "149",
    period: "/mes",
    features: [
      "5 marcas",
      "100 GEO audits/mes",
      "1000 prompts monitoreados",
      "Competitor tracking",
      "Content recommendations",
      "Monitoreo avanzado",
      "Reportes semanales",
      "Soporte prioritario"
    ],
    highlighted: true,
    cta: "Comenzar prueba"
  },
  {
    name: "Enterprise",
    description: "Para grandes organizaciones",
    price: "Contactar",
    period: "",
    features: [
      "Marcas ilimitadas",
      "API access",
      "Monitoreo continuo 24/7",
      "Reportes personalizados",
      "Integraciones custom",
      "Dedicated account manager",
      "Prioridad máxima"
    ],
    highlighted: false,
    cta: "Request early access"
  }
]

export function PricingSection() {
  return (
    <section id="pricing" className="relative py-24 px-4 overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/3 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-sm text-muted-foreground mb-6">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>Precios transparentes</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 text-balance">
            Elige tu plan{" "}
            <span className="text-gradient">GEO</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
            Planes flexibles para cada etapa de tu estrategia de optimización en IA.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`relative group ${plan.highlighted ? "md:-translate-y-4" : ""}`}
            >
              {/* Highlighted badge */}
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                  <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-primary/40 bg-primary/20 text-primary text-sm font-semibold tracking-wide">
                    <Zap className="w-3.5 h-3.5" />
                    Mejor valor
                  </div>
                </div>
              )}

              {/* Card */}
              <div className={`relative h-full glass rounded-2xl p-6 lg:p-8 transition-all duration-300 ${
                plan.highlighted 
                  ? "border-primary/60 shadow-[0_0_38px_rgba(59,130,246,0.22)]" 
                  : "hover:border-primary/30"
              }`}>
                {/* Header */}
                <div className="mb-6">
                  <h3 className="text-xl font-semibold tracking-tight text-foreground mb-2">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    {plan.price !== "Contactar" && <span className="text-muted-foreground">$</span>}
                    <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <div className="w-5 h-5 shrink-0 rounded-full bg-primary/20 flex items-center justify-center mt-0.5">
                        <Check className="w-3 h-3 text-primary" />
                      </div>
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Button 
                  className={`w-full ${
                    plan.highlighted 
                      ? "bg-primary hover:bg-primary/90" 
                      : "bg-secondary hover:bg-secondary/80"
                  }`}
                  asChild
                >
                  <Link href={plan.name === "Enterprise" ? "/geo#pricing" : "/geo/app/billing"}>{plan.cta}</Link>
                </Button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom note */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center text-sm text-muted-foreground mt-12 space-y-1"
        >
          <p>No credit card required</p>
          <p>Cancel anytime</p>
          <p>Powered by GPT, Gemini &amp; Perplexity</p>
        </motion.div>
      </div>
    </section>
  )
}
