"use client"

import { motion } from "framer-motion"
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts"
import { TrendingUp, ArrowUpRight, Bell, Search, MessageSquare, Sparkles } from "lucide-react"

const trendData = [
  { name: "Sem 1", chatgpt: 45, gemini: 38, perplexity: 52 },
  { name: "Sem 2", chatgpt: 52, gemini: 42, perplexity: 58 },
  { name: "Sem 3", chatgpt: 58, gemini: 48, perplexity: 63 },
  { name: "Sem 4", chatgpt: 65, gemini: 55, perplexity: 71 },
  { name: "Sem 5", chatgpt: 72, gemini: 62, perplexity: 78 },
  { name: "Sem 6", chatgpt: 78, gemini: 68, perplexity: 84 },
]

const citationsByEngine = [
  { name: "ChatGPT", value: 35, color: "#8b5cf6" },
  { name: "Gemini", value: 28, color: "#a855f7" },
  { name: "Perplexity", value: 22, color: "#6366f1" },
  { name: "AI Overviews", value: 15, color: "#818cf8" },
]

const competitorData = [
  { name: "Tu marca", score: 78 },
  { name: "Comp. A", score: 65 },
  { name: "Comp. B", score: 58 },
  { name: "Comp. C", score: 42 },
]

export function DashboardPreviewSection() {
  return (
    <section className="relative py-24 px-4 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[800px] bg-primary/5 rounded-full blur-[200px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 text-balance">
            Un dashboard diseñado para{" "}
            <span className="text-gradient">tomar acción</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
            Visualiza tu visibilidad en IA con métricas claras y accionables.
          </p>
        </motion.div>

        {/* Dashboard preview */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="relative"
        >
          <div className="glass rounded-2xl p-1 glow-primary">
            <div className="bg-card/90 rounded-xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  <span className="font-semibold text-foreground">Botz GEO Engine</span>
                </div>
                <div className="flex items-center gap-4">
                  <button className="p-2 rounded-lg hover:bg-secondary/50 transition-colors">
                    <Bell className="w-5 h-5 text-muted-foreground" />
                  </button>
                  <button className="p-2 rounded-lg hover:bg-secondary/50 transition-colors">
                    <Search className="w-5 h-5 text-muted-foreground" />
                  </button>
                  <div className="w-8 h-8 rounded-full bg-primary/20" />
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                {/* Top stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <DashboardStat label="AI Visibility Score" value="78" suffix="/100" change="+12%" positive />
                  <DashboardStat label="Total Citaciones" value="1,247" change="+156" positive />
                  <DashboardStat label="Ranking Promedio" value="#4" change="+2" positive />
                  <DashboardStat label="Oportunidades" value="23" change="nuevo" />
                </div>

                {/* Charts row */}
                <div className="grid lg:grid-cols-3 gap-6 mb-6">
                  {/* Trend chart */}
                  <div className="lg:col-span-2 bg-secondary/20 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium text-foreground">Tendencia de Visibilidad</h4>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary" />ChatGPT</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent" />Gemini</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-chart-3" />Perplexity</span>
                      </div>
                    </div>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendData}>
                          <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                          <YAxis hide />
                          <Line type="monotone" dataKey="chatgpt" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="gemini" stroke="#a855f7" strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="perplexity" stroke="#6366f1" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Pie chart */}
                  <div className="bg-secondary/20 rounded-xl p-4">
                    <h4 className="font-medium text-foreground mb-4">Citaciones por Motor</h4>
                    <div className="h-48 flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={citationsByEngine}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={70}
                            dataKey="value"
                            stroke="none"
                          >
                            {citationsByEngine.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {citationsByEngine.map((engine) => (
                        <span key={engine.name} className="text-xs text-muted-foreground flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: engine.color }} />
                          {engine.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bottom row */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Competitor comparison */}
                  <div className="bg-secondary/20 rounded-xl p-4">
                    <h4 className="font-medium text-foreground mb-4">vs Competidores</h4>
                    <div className="h-32">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={competitorData} layout="vertical">
                          <XAxis type="number" hide />
                          <YAxis type="category" dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} width={70} />
                          <Bar dataKey="score" radius={4}>
                            {competitorData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={index === 0 ? "#8b5cf6" : "#3f3f46"} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Recent activity */}
                  <div className="bg-secondary/20 rounded-xl p-4">
                    <h4 className="font-medium text-foreground mb-4">Actividad Reciente</h4>
                    <div className="space-y-3">
                      <ActivityItem 
                        icon={<MessageSquare className="w-4 h-4" />}
                        title="Nueva citación en ChatGPT"
                        time="hace 2h"
                        positive
                      />
                      <ActivityItem 
                        icon={<TrendingUp className="w-4 h-4" />}
                        title="Ranking mejorado en Perplexity"
                        time="hace 5h"
                        positive
                      />
                      <ActivityItem 
                        icon={<ArrowUpRight className="w-4 h-4" />}
                        title="Oportunidad de contenido detectada"
                        time="hace 1d"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

function DashboardStat({ 
  label, 
  value, 
  suffix, 
  change, 
  positive 
}: { 
  label: string
  value: string
  suffix?: string
  change: string
  positive?: boolean
}) {
  return (
    <div className="bg-secondary/20 rounded-xl p-4">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-foreground">{value}</span>
        {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
      </div>
      <span className={`text-xs ${positive ? 'text-green-400' : 'text-primary'}`}>{change}</span>
    </div>
  )
}

function ActivityItem({ 
  icon, 
  title, 
  time, 
  positive 
}: { 
  icon: React.ReactNode
  title: string
  time: string
  positive?: boolean
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${positive ? 'bg-green-500/10 text-green-400' : 'bg-primary/10 text-primary'}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground truncate">{title}</p>
        <p className="text-xs text-muted-foreground">{time}</p>
      </div>
    </div>
  )
}
