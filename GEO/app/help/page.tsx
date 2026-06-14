"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { AppHeader } from "@/components/geo/app-shell"
import {
  Rocket,
  HelpCircle,
  BookOpen,
  PlayCircle,
  MessageCircle,
  Mail,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
  ExternalLink,
  Search,
  Lightbulb,
  Zap,
  Target,
  BarChart3,
} from "lucide-react"
import { useGeoI18n } from "@/GEO/components/geo/i18n"

const onboardingSteps = [
  { id: 1, title: "Crear tu cuenta", description: "Registrarte y configurar perfil", completed: true },
  { id: 2, title: "Agregar tu marca", description: "Configurar dominio y keywords", completed: true },
  { id: 3, title: "Ejecutar primera auditoría", description: "Analizar visibilidad actual", completed: true },
  { id: 4, title: "Revisar resultados", description: "Entender tu GEO Score", completed: false },
  { id: 5, title: "Agregar competidores", description: "Comparar tu rendimiento", completed: false },
  { id: 6, title: "Configurar alertas", description: "Monitoreo automático", completed: false },
]

const faqs = [
  {
    id: 1,
    question: "¿Qué es el GEO Score y cómo se calcula?",
    answer: "El GEO Score es una métrica estricta de 0-100 que prioriza la visibilidad espontánea: cuando tu marca aparece en respuestas de IA sin que la pregunta la mencione. Los prompts comparativos o asistidos ayudan al diagnóstico, pero no inflan el score principal."
  },
  {
    id: 7,
    question: "¿Qué diferencia hay entre visibilidad espontánea y visibilidad asistida?",
    answer: "Visibilidad espontánea significa que la IA menciona tu marca en una pregunta neutral, por ejemplo: 'mejores proveedores de software en Canadá'. Visibilidad asistida significa que la pregunta ya nombraba tu marca, por ejemplo: 'compara Botz vs HubSpot'. La espontánea es la señal más fuerte de reconocimiento real."
  },
  {
    id: 2,
    question: "¿Con qué frecuencia debo ejecutar auditorías?",
    answer: "Recomendamos ejecutar auditorías semanales para tracking continuo. Para análisis profundos, auditorías mensuales son ideales. Las auditorías automáticas pueden configurarse en la sección de reportes."
  },
  {
    id: 3,
    question: "¿Qué motores de IA analiza Botz GEO?",
    answer: "Actualmente analizamos ChatGPT (GPT-4), Google Gemini, Perplexity AI y AI Overviews de Google. Constantemente agregamos nuevos motores a medida que surgen."
  },
  {
    id: 4,
    question: "¿Cómo mejoro mi visibilidad en buscadores IA?",
    answer: "Las principales estrategias incluyen: crear contenido autoritativo y bien estructurado, obtener menciones en fuentes confiables, optimizar schema markup, y mantener información actualizada y precisa sobre tu marca."
  },
  {
    id: 5,
    question: "¿Puedo exportar mis datos y reportes?",
    answer: "Sí, puedes exportar todos los datos en formato PDF, Excel o CSV desde la sección de Reportes. También ofrecemos API para integraciones personalizadas."
  },
  {
    id: 6,
    question: "¿Cómo funciona el tracking de competidores?",
    answer: "Puedes agregar hasta 10 competidores (según tu plan) y trackear sus métricas GEO en tiempo real. Recibirás alertas cuando sus scores cambien significativamente."
  },
]

const tutorials = [
  {
    id: 1,
    title: "Introducción a GEO",
    description: "Aprende los fundamentos de la optimización para IA",
    duration: "5 min",
    icon: Lightbulb,
  },
  {
    id: 2,
    title: "Tu primera auditoría",
    description: "Guía paso a paso para analizar tu marca",
    duration: "8 min",
    icon: Zap,
  },
  {
    id: 3,
    title: "Análisis de competidores",
    description: "Cómo comparar tu visibilidad con la competencia",
    duration: "6 min",
    icon: Target,
  },
  {
    id: 4,
    title: "Interpretando reportes",
    description: "Entiende todas las métricas y gráficos",
    duration: "10 min",
    icon: BarChart3,
  },
]

export default function HelpPage() {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(1)
  const completedSteps = onboardingSteps.filter(s => s.completed).length
  const progress = (completedSteps / onboardingSteps.length) * 100
  const { t, locale } = useGeoI18n()
  const isEn = locale === "en"
  const supportEmail = process.env.NEXT_PUBLIC_GEO_SUPPORT_EMAIL || "hola@botz.fyi"
  const openGeoAssistant = () => window.dispatchEvent(new Event("open-geo-assistant"))
  const onboardingLabels = isEn
    ? [
        { title: "Create your account", description: "Register and configure your profile" },
        { title: "Add your brand", description: "Configure domain and keywords" },
        { title: "Run your first audit", description: "Analyze current visibility" },
        { title: "Review results", description: "Understand your GEO Score" },
        { title: "Add competitors", description: "Compare your performance" },
        { title: "Configure alerts", description: "Automatic monitoring" },
      ]
    : onboardingSteps
  const translatedFaqs = isEn
    ? [
        {
          id: 1,
          question: "What is the GEO Score and how is it calculated?",
          answer: "The GEO Score is a strict 0-100 metric weighted toward spontaneous visibility: when your brand appears in AI answers without being named in the prompt. Assisted or comparative prompts help diagnosis, but they do not inflate the main score.",
        },
        {
          id: 7,
          question: "What is the difference between spontaneous and assisted visibility?",
          answer: "Spontaneous visibility means AI mentions your brand in a neutral question, for example: 'best software providers in Canada'. Assisted visibility means the prompt already named your brand, for example: 'compare Botz vs HubSpot'. Spontaneous visibility is the strongest signal of real market recognition.",
        },
        {
          id: 2,
          question: "How often should I run audits?",
          answer: "We recommend weekly audits for continuous tracking. For deeper analysis, monthly audits are ideal. Automatic audits can be configured in the reports section.",
        },
        {
          id: 3,
          question: "Which AI engines does Botz GEO analyze?",
          answer: "We currently analyze ChatGPT, Google Gemini, Perplexity AI and Google AI Overviews. We keep adding new engines as they emerge.",
        },
        {
          id: 4,
          question: "How do I improve my visibility in AI search engines?",
          answer: "The main strategies include creating authoritative, well-structured content, earning mentions from trusted sources, optimizing schema markup and keeping accurate brand information up to date.",
        },
        {
          id: 5,
          question: "Can I export my data and reports?",
          answer: "Yes. You can export data as PDF, Excel or CSV from the Reports section. We also offer API access for custom integrations.",
        },
        {
          id: 6,
          question: "How does competitor tracking work?",
          answer: "You can add competitors based on your plan and track their GEO metrics in real time. You receive alerts when their scores change significantly.",
        },
      ]
    : faqs
  const translatedTutorials = isEn
    ? [
        { ...tutorials[0], title: "Introduction to GEO", description: "Learn the fundamentals of AI optimization" },
        { ...tutorials[1], title: "Your first audit", description: "Step-by-step guide to analyze your brand" },
        { ...tutorials[2], title: "Competitor analysis", description: "How to compare your visibility against competitors" },
        { ...tutorials[3], title: "Understanding reports", description: "Learn every metric and chart" },
      ]
    : tutorials

  return (
    <>
      <AppHeader />
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
              <h2 className="text-2xl font-bold">{t("helpCenter")}</h2>
            <p className="text-muted-foreground">{isEn ? "Resources, tutorials and support" : "Recursos, tutoriales y soporte"}</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
               placeholder={isEn ? "Search help..." : "Buscar en ayuda..."}
              className="pl-10 pr-4 py-2 w-64 bg-secondary/50 border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>
        </div>

        {/* Onboarding Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="glass border-border bg-gradient-to-r from-primary/10 to-accent/10">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                    <Rocket className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Onboarding</CardTitle>
                    <CardDescription>{completedSteps} {isEn ? "of" : "de"} {onboardingSteps.length} {isEn ? "steps completed" : "pasos completados"}</CardDescription>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">{Math.round(progress)}%</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Progress bar */}
              <div className="w-full h-2 rounded-full bg-secondary mb-6 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                  className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                />
              </div>

              {/* Steps */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {onboardingSteps.map((step, index) => (
                  <div
                    key={step.id}
                    className={`p-3 rounded-xl transition-colors ${
                      step.completed 
                        ? "bg-primary/20 border border-primary/30" 
                        : "bg-secondary/30 border border-border hover:border-primary/30"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {step.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                      ) : (
                        <Circle className="w-5 h-5 text-muted-foreground" />
                      )}
                      <span className="text-xs text-muted-foreground">{isEn ? "Step" : "Paso"} {step.id}</span>
                    </div>
                    <p className="text-sm font-medium">{onboardingLabels[index]?.title ?? step.title}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* FAQ Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="lg:col-span-2"
          >
            <Card className="glass border-border">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <HelpCircle className="w-5 h-5 text-primary" />
                  <CardTitle>{isEn ? "Frequently Asked Questions" : "Preguntas Frecuentes"}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {translatedFaqs.map((faq) => (
                  <div
                    key={faq.id}
                    className="rounded-xl border border-border overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-secondary/30 transition-colors"
                    >
                      <span className="font-medium">{faq.question}</span>
                      {expandedFaq === faq.id ? (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      )}
                    </button>
                    {expandedFaq === faq.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-4 pb-4"
                      >
                        <p className="text-muted-foreground">{faq.answer}</p>
                      </motion.div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          {/* Tutorials & Support */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="space-y-6"
          >
            {/* Tutorials */}
            <Card className="glass border-border">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <PlayCircle className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg">{isEn ? "Video Tutorials" : "Tutoriales en Video"}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {translatedTutorials.map((tutorial) => (
                  <div
                    key={tutorial.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                      <tutorial.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{tutorial.title}</p>
                      <p className="text-xs text-muted-foreground">{tutorial.duration}</p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Support Contact */}
            <Card className="glass border-border">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <MessageCircle className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg">{isEn ? "Support" : "Soporte"}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                   {isEn ? "Can not find what you need? Our team is here to help you." : "¿No encuentras lo que buscas? Nuestro equipo está aquí para ayudarte."}
                </p>

                <Button className="w-full bg-primary hover:bg-primary/90" onClick={openGeoAssistant}>
                  <MessageCircle className="w-4 h-4 mr-2" />
                    {isEn ? "Start Chat" : "Iniciar Chat"}
                </Button>

                <Button variant="outline" className="w-full border-border" asChild>
                  <a href={`mailto:${supportEmail}?subject=Soporte%20Botz%20GEO&body=Hola%2C%20necesito%20ayuda%20con%20Botz%20GEO.`}>
                    <Mail className="w-4 h-4 mr-2" />
                    {isEn ? "Send Email" : "Enviar Email"}
                  </a>
                </Button>

                <Button variant="outline" className="w-full border-border" asChild>
                  <Link href="/geo/agendar-demo">{isEn ? "Book a GEO demo" : "Agendar demo GEO"}</Link>
                </Button>

                <div className="pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground text-center">
                     {isEn ? "Average response time:" : "Tiempo de respuesta promedio:"} <span className="text-primary font-medium">{isEn ? "under 2 hours" : "menos de 2 horas"}</span>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Documentation */}
            <Card className="glass border-border bg-gradient-to-br from-primary/10 to-accent/10">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                     <h3 className="font-semibold">{isEn ? "Documentation" : "Documentación"}</h3>
                     <p className="text-sm text-muted-foreground">{isEn ? "Technical guides and API" : "Guías técnicas y API"}</p>
                  </div>
                </div>
                <Button variant="outline" className="w-full mt-4 border-border">
                   {isEn ? "View Documentation" : "Ver Documentación"}
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

    </>
  )
}
