"use client"

import { motion } from "framer-motion"
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, AreaChart, Area } from "recharts"
import { TrendingUp, Eye, Zap, Target } from "lucide-react"
import { useGeoI18n } from "@/GEO/components/geo/i18n"

const visibilityData = [
  { month: "Ene", score: 32 },
  { month: "Feb", score: 38 },
  { month: "Mar", score: 45 },
  { month: "Abr", score: 52 },
  { month: "May", score: 61 },
  { month: "Jun", score: 78 },
]

const citationsData = [
  { day: "L", value: 12 },
  { day: "M", value: 18 },
  { day: "X", value: 15 },
  { day: "J", value: 22 },
  { day: "V", value: 28 },
  { day: "S", value: 25 },
  { day: "D", value: 31 },
]

export function DashboardMockup() {
  const { locale } = useGeoI18n()
  const isEn = locale === "en"

  return (
    <div className="relative mx-auto max-w-5xl">
      {/* Glow effect behind dashboard */}
      <div className="absolute inset-0 bg-gradient-to-t from-primary/20 via-accent/10 to-transparent rounded-3xl blur-3xl -z-10" />
      
      {/* Main dashboard container */}
      <motion.div 
        className="glass rounded-2xl p-1 glow-primary"
        whileHover={{ scale: 1.01 }}
        transition={{ duration: 0.3 }}
      >
        <div className="bg-card/80 rounded-xl overflow-hidden">
          {/* Dashboard header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
            </div>
            <div className="flex-1 text-center">
              <span className="text-xs text-muted-foreground">Botz GEO Engine — Dashboard</span>
            </div>
          </div>

          {/* Dashboard content */}
          <div className="p-6">
            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <StatCard 
                icon={<Eye className="w-5 h-5" />}
                label="AI Visibility Score"
                value="78"
                suffix="/100"
                trend="+12%"
                color="text-primary"
              />
              <StatCard 
                icon={<Target className="w-5 h-5" />}
                label={isEn ? "Citations" : "Citaciones"}
                value="247"
                trend="+34%"
                color="text-accent"
              />
              <StatCard 
                icon={<TrendingUp className="w-5 h-5" />}
                label={isEn ? "AI Rankings" : "Rankings IA"}
                value="#3"
                trend="+2"
                color="text-chart-3"
              />
              <StatCard 
                icon={<Zap className="w-5 h-5" />}
                label={isEn ? "Opportunities" : "Oportunidades"}
                value="18"
                trend={isEn ? "new" : "nuevo"}
                color="text-chart-4"
              />
            </div>

            {/* Charts row */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Visibility chart */}
              <div className="bg-secondary/30 rounded-xl p-4">
                <h4 className="text-sm font-medium text-foreground mb-4">{isEn ? "AI Visibility Evolution" : "Evolucion de Visibilidad IA"}</h4>
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={visibilityData}>
                      <defs>
                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Area type="monotone" dataKey="score" stroke="#8b5cf6" strokeWidth={2} fill="url(#colorScore)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Citations chart */}
              <div className="bg-secondary/30 rounded-xl p-4">
                <h4 className="text-sm font-medium text-foreground mb-4">{isEn ? "Citations by AI Engine" : "Citaciones por Motor IA"}</h4>
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={citationsData}>
                      <XAxis dataKey="day" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Line type="monotone" dataKey="value" stroke="#a855f7" strokeWidth={2} dot={{ fill: '#a855f7', r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* AI Engines row */}
            <div className="mt-4 flex flex-wrap gap-3 justify-center">
              <AIEngineBadge name="ChatGPT" score={82} />
              <AIEngineBadge name="Gemini" score={76} />
              <AIEngineBadge name="Perplexity" score={89} />
              <AIEngineBadge name="AI Overviews" score={71} />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Floating cards */}
      <motion.div
        className="absolute -left-4 md:-left-12 top-1/3 glass rounded-xl p-3 hidden md:block"
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-green-400" />
          </div>
          <div>
             <p className="text-xs text-muted-foreground">{isEn ? "Ranking improved" : "Ranking mejorado"}</p>
             <p className="text-sm font-semibold text-foreground">{isEn ? "+5 positions" : "+5 posiciones"}</p>
          </div>
        </div>
      </motion.div>

      <motion.div
        className="absolute -right-4 md:-right-12 top-1/2 glass rounded-xl p-3 hidden md:block"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary" />
          </div>
          <div>
             <p className="text-xs text-muted-foreground">{isEn ? "New citation" : "Nueva citacion"}</p>
            <p className="text-sm font-semibold text-foreground">ChatGPT</p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

function StatCard({ 
  icon, 
  label, 
  value, 
  suffix, 
  trend, 
  color 
}: { 
  icon: React.ReactNode
  label: string
  value: string
  suffix?: string
  trend: string
  color: string
}) {
  return (
    <div className="bg-secondary/30 rounded-xl p-4">
      <div className={`${color} mb-2`}>{icon}</div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-foreground">{value}</span>
        {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
      </div>
      <span className="text-xs text-green-400">{trend}</span>
    </div>
  )
}

function AIEngineBadge({ name, score }: { name: string; score: number }) {
  return (
    <div className="flex items-center gap-2 bg-secondary/50 rounded-full px-4 py-2">
      <span className="text-sm text-foreground">{name}</span>
      <span className="text-xs font-semibold text-primary">{score}%</span>
    </div>
  )
}
