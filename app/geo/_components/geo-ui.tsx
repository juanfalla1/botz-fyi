"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3, Bot, Compass, FileSearch, LineChart, Sparkles, Target } from "lucide-react";
import { demoRecommendations, demoScore, visibilityTrend } from "@geo/geo/mock-data";

export function Button({ href, children, variant = "primary" }: { href?: string; children: React.ReactNode; variant?: "primary" | "ghost" }) {
  const cls = variant === "primary"
    ? "rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 px-5 py-2.5 font-semibold text-white shadow-[0_18px_60px_rgba(14,165,233,.35)]"
    : "rounded-full border border-white/15 bg-white/5 px-5 py-2.5 font-semibold text-white";
  return href ? <Link href={href} className={cls}>{children}</Link> : <button className={cls}>{children}</button>;
}

export function GeoHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#030712]/75 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
        <Link href="/geo" className="flex items-center gap-3">
          <Image src="/botz-logo.png" alt="Botz" width={34} height={34} />
          <div><p className="text-sm font-bold">BOTZ</p><p className="text-[10px] tracking-[0.2em] text-cyan-300">GEO ENGINE</p></div>
        </Link>
        <nav className="hidden gap-7 text-sm text-slate-300 md:flex"><a href="#features">Features</a><a href="#how">How it works</a><Link href="/geo/login">Login</Link></nav>
        <Button href="/geo/app">Start GEO Audit</Button>
      </div>
    </header>
  );
}

export function HeroMockup() {
  return (
    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="relative">
      <div className="geo-panel geo-grid geo-glow relative rounded-3xl p-5 [transform:perspective(1300px)_rotateY(-8deg)_rotateX(6deg)]">
        <div className="grid gap-3 sm:grid-cols-2">
          {[["AI Visibility", "92"], ["Citations", "41.8%"], ["Mentions", "2,418"], ["Tracked Engines", "5"]].map(([k, v]) => (
            <div key={k} className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-xs text-slate-400">{k}</p><p className="mt-2 text-3xl font-semibold">{v}</p></div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export function FeatureCard({ icon: Icon, title, text }: { icon: React.ElementType; title: string; text: string }) {
  return <div className="geo-panel rounded-3xl p-6"><Icon className="h-8 w-8 text-cyan-300" /><h3 className="mt-4 text-xl font-semibold">{title}</h3><p className="mt-2 text-sm text-slate-300">{text}</p></div>;
}

export function GeoShell({ children }: { children: React.ReactNode }) {
  const links = [["Dashboard", "/geo/app"], ["Audit Demo", "/geo/app/audit-demo"], ["Projects", "/geo/app/projects/new"], ["Recommendations", "/geo/app/projects/proj_01/recommendations"]];
  return (
    <div className="min-h-screen">
      <div className="mx-auto grid max-w-[1440px] lg:grid-cols-[260px_1fr]">
        <aside className="hidden border-r border-white/10 bg-[#030712]/65 p-6 lg:block">
          <Link href="/geo" className="flex items-center gap-3"><Image src="/botz-logo.png" alt="Botz" width={30} height={30} /><div><p className="text-sm font-bold">BOTZ</p><p className="text-[10px] tracking-[0.2em] text-cyan-300">GEO ENGINE</p></div></Link>
          <nav className="mt-8 space-y-2">{links.map(([n, h]) => <Link key={h} href={h} className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/10">{n}</Link>)}</nav>
        </aside>
        <main className="p-4 sm:p-8">{children}</main>
      </div>
    </div>
  );
}

export function MetricCard({ title, value, hint }: { title: string; value: string; hint: string }) {
  return <div className="geo-panel rounded-2xl p-5"><p className="text-sm text-slate-400">{title}</p><p className="mt-2 text-3xl font-semibold">{value}</p><p className="mt-2 text-xs text-emerald-300">{hint}</p></div>;
}

export function VisibilityChart() {
  return (
    <div className="geo-panel rounded-3xl p-5">
      <p className="mb-4 text-sm text-slate-300">Visibility trend</p>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={visibilityTrend}><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22d3ee" stopOpacity={0.8} /><stop offset="95%" stopColor="#22d3ee" stopOpacity={0.05} /></linearGradient></defs><CartesianGrid stroke="rgba(255,255,255,.08)" /><XAxis dataKey="name" stroke="#94A3B8" /><YAxis stroke="#94A3B8" /><Tooltip /><Area type="monotone" dataKey="score" stroke="#22d3ee" fill="url(#g)" strokeWidth={3} /></AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function ScoreRing({ score }: { score?: number }) {
  const value = score ?? demoScore.finalScore;
  return <div className="geo-panel flex h-72 items-center justify-center rounded-3xl"><div className="flex h-52 w-52 items-center justify-center rounded-full border-[16px] border-cyan-400/85 border-r-white/10 border-b-white/10"><div className="text-center"><p className="text-5xl font-semibold">{value}</p><p className="text-xs text-slate-400">GEO Score</p></div></div></div>;
}

export const featureItems = [
  { icon: Sparkles, title: "AI Visibility Score", text: "Mide qué tan visible es tu marca en respuestas de IA." },
  { icon: FileSearch, title: "Citation Tracking", text: "Detecta cuándo, dónde y cómo te citan los motores." },
  { icon: Compass, title: "Competitor Intelligence", text: "Compara tu autoridad frente a competidores directos." },
  { icon: Bot, title: "GEO Recommendations", text: "Acciones priorizadas para mejorar relevancia semántica." },
  { icon: Target, title: "Content Opportunities", text: "Ideas de contenido diseñadas para prompts reales." },
  { icon: LineChart, title: "Continuous Monitoring", text: "Seguimiento continuo con métricas de evolución." },
];

export function RecommendationList() {
  return <div className="space-y-3">{demoRecommendations.map((r) => <div key={r.id} className="geo-panel rounded-2xl p-4"><p className="text-xs text-cyan-200">{r.priority} · {r.type}</p><p className="mt-1 font-semibold">{r.title}</p><p className="mt-1 text-sm text-slate-300">{r.suggestedAction}</p></div>)}</div>;
}

export function StatusBadge({ text }: { text: string }) {
  return <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-xs text-slate-300">{text}</span>;
}

export function RecommendationCard({ title, description, meta, action }: { title: string; description: string; meta: string; action: string }) {
  return <div className="geo-panel rounded-2xl p-4"><p className="text-xs text-cyan-200">{meta}</p><p className="mt-1 font-semibold">{title}</p><p className="mt-1 text-sm text-slate-300">{description}</p><p className="mt-2 text-sm">{action}</p></div>;
}

export const scoreCards: Array<[string, number]> = [
  ["AI Visibility", demoScore.aiVisibilityScore],
  ["Citation Probability", demoScore.citationProbability],
  ["Brand Mention", demoScore.brandMentionScore],
  ["Competitor Dominance", demoScore.competitorDominanceScore],
  ["Entity Consistency", demoScore.entityConsistencyScore],
  ["Structured Data", demoScore.structuredDataScore],
];

export const dashboardStats = [
  ["AI Visibility", "78", "+22%"],
  ["Audits Completed", "12", "4 this week"],
  ["Brand Mentions", "1,246", "+31.5%"],
  ["Competitors", "8", "tracked"],
];

export const iconsRow = [BarChart3, Sparkles, Bot];
