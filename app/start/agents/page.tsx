"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/app/supabaseClient";
import { useRouter } from "next/navigation";
import { 
  Mic, 
  MessageSquare, 
  Workflow, 
  Plus, 
  Bot, 
  Phone, 
  MessageCircle,
  Settings,
  BarChart3,
  Users,
  Zap,
  ChevronRight,
  MoreVertical,
  Play,
  Pause,
  Copy,
  Trash2,
  Edit3,
  Headphones,
  FileText,
  Cpu,
  Sparkles,
  Crown,
  RefreshCw,
  ArrowRight,
  LayoutGrid,
  List
} from "lucide-react";

interface Agent {
  id: string;
  name: string;
  type: 'voice' | 'text' | 'flow';
  status: 'draft' | 'active' | 'paused';
  description: string;
  avatar_url?: string;
  total_conversations: number;
  created_at: string;
}

interface Template {
  id: string;
  name: string;
  type: 'voice' | 'text' | 'flow';
  category: string;
  description: string;
  avatar: string;
  color: string;
}

export default function AgentStudio() {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [credits, setCredits] = useState({ used: 200, limit: 3000 });

  const templates: Template[] = [
    {
      id: 'lia',
      name: 'Lía',
      type: 'voice',
      category: 'Calificación de leads entrantes',
      description: 'Califica leads entrantes con conversaciones naturales y profesionales',
      avatar: '🎯',
      color: '#a3e635'
    },
    {
      id: 'alex',
      name: 'Alex',
      type: 'voice', 
      category: 'Llamadas en frío salientes',
      description: 'Realiza prospección activa con llamadas de seguimiento inteligentes',
      avatar: '📞',
      color: '#a3e635'
    },
    {
      id: 'julia',
      name: 'Julia',
      type: 'text',
      category: 'Asistente Recepcionista',
      description: 'Atiende consultas, agenda citas y proporciona información automáticamente',
      avatar: '💬',
      color: '#0096ff'
    }
  ];

  const creationOptions = [
    {
      id: 'voice',
      title: 'Crear Agente de Voz',
      description: 'Realiza y recibe llamadas telefónicas con conversaciones naturales',
      icon: '📞',
      features: ['Llamadas entrantes/salientes', 'Voz natural', 'Transcripción', 'Grabación'],
      gradient: 'from-red-500/20 to-red-600/10',
      borderColor: 'border-red-500/30',
      iconBg: 'bg-red-500/20'
    },
    {
      id: 'text',
      title: 'Crear Agente de Texto',
      description: 'Responde mensajes en WhatsApp, web y otras plataformas',
      icon: '💬',
      features: ['WhatsApp', 'Web chat', 'Respuestas instantáneas', 'Multilingüe'],
      gradient: 'from-blue-500/20 to-blue-600/10',
      borderColor: 'border-blue-500/30',
      iconBg: 'bg-blue-500/20'
    },
    {
      id: 'flow',
      title: 'Crear Flujo',
      description: 'Automatizaciones con lógica visual y condiciones',
      icon: '⚡',
      features: ['Editor visual', 'Condiciones', 'Integraciones', 'Triggers'],
      gradient: 'from-purple-500/20 to-purple-600/10',
      borderColor: 'border-purple-500/30',
      iconBg: 'bg-purple-500/20'
    },
    {
      id: 'notetaker',
      title: 'Configurar Notetaker',
      description: 'Transcripción y análisis automático de llamadas',
      icon: '📝',
      features: ['Transcripción', 'Análisis', 'Resumen', 'Action items'],
      gradient: 'from-green-500/20 to-green-600/10',
      borderColor: 'border-green-500/30',
      iconBg: 'bg-green-500/20'
    }
  ];

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('ai_agents')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAgents(data || []);
    } catch (error) {
      console.error('Error fetching agents:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1117]">
      {/* Header */}
      <header className="border-b border-white/5 bg-[#0f1117]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#0096ff] rounded-xl flex items-center justify-center shadow-lg shadow-[#0096ff]/20">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Agent Studio</h1>
                <p className="text-sm text-gray-400">Crea y gestiona tus agentes IA</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Credits */}
              <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5">
                <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                  <Zap className="w-3.5 h-3.5 text-[#a3e635]" />
                  <span>Créditos usados</span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-white font-semibold">{credits.used.toLocaleString()}</span>
                  <span className="text-gray-500 text-sm">/ {credits.limit.toLocaleString()}</span>
                </div>
                <div className="w-32 h-1.5 bg-gray-800 rounded-full mt-1.5 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[#0096ff] to-[#a3e635] rounded-full"
                    style={{ width: `${(credits.used / credits.limit) * 100}%` }}
                  />
                </div>
              </div>
              
              <button className="bg-[#a3e635] text-[#0f1117] px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#b5f54a] transition-colors flex items-center gap-2">
                <Crown className="w-4 h-4" />
                Mejorar plan
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome */}
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-white mb-2">
            Hola, ¿qué quieres crear hoy?
          </h2>
          <p className="text-gray-400">
            Construye agentes IA que trabajen 24/7 para escalar tu operación
          </p>
        </div>

        {/* Creation Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
          {creationOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => router.push(`/start/agents/create?type=${option.id === 'notetaker' ? 'voice' : option.id}`)}
              className={`group relative bg-gradient-to-br ${option.gradient} ${option.borderColor} border rounded-2xl p-6 text-left transition-all hover:scale-[1.02] hover:shadow-xl`}
            >
              <div className="mb-5">
                <span className="text-4xl">{option.icon}</span>
              </div>
              
              <h3 className="text-lg font-semibold text-white mb-2">{option.title}</h3>
              <p className="text-sm text-gray-400 mb-4 line-clamp-2">{option.description}</p>
              
              <div className="flex flex-wrap gap-1.5">
                {option.features.slice(0, 2).map((feature, idx) => (
                  <span key={idx} className="text-xs bg-white/10 text-gray-300 px-2 py-1 rounded-md">
                    {feature}
                  </span>
                ))}
              </div>

              <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <ArrowRight className="w-5 h-5 text-white" />
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Templates Section */}
        <div className="mb-12">
          <h3 className="text-lg font-semibold text-white mb-5">
            O inicia con casos de uso populares
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => router.push(`/start/agents/create?template=${template.id}`)}
                className="group flex items-center gap-4 bg-[#1a1d26] border border-white/5 rounded-xl p-4 text-left transition-all hover:border-[#a3e635]/30 hover:bg-[#1e212b]"
              >
                <div 
                  className="w-14 h-14 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ backgroundColor: `${template.color}20` }}
                >
                  {template.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-white mb-0.5">{template.name}</h4>
                  <p className="text-xs text-gray-400 truncate">{template.category}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-[#a3e635] transition-colors" />
              </button>
            ))}
          </div>
        </div>

        {/* My Agents Section */}
        <div className="bg-[#1a1d26] border border-white/5 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Mis Agentes</h3>
              <p className="text-sm text-gray-500 mt-0.5">Gestiona tus agentes creados</p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* View Toggle */}
              <div className="flex items-center bg-[#0f1117] rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white'}`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => router.push('/start/agents/create')}
                className="bg-[#0096ff] hover:bg-[#0077cc] text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Nuevo Agente
              </button>
            </div>
          </div>

          {agents.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-5">
                <Bot className="w-10 h-10 text-gray-600" />
              </div>
              <h4 className="text-lg font-medium text-white mb-2">No tienes agentes aún</h4>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                Crea tu primer agente usando las plantillas de arriba o personaliza uno desde cero
              </p>
              <button
                onClick={() => router.push('/start/agents/create')}
                className="bg-white/10 hover:bg-white/15 text-white px-6 py-3 rounded-xl font-medium transition-colors inline-flex items-center gap-2"
              >
                <Sparkles className="w-5 h-5 text-[#a3e635]" />
                Crear mi primer agente
              </button>
            </div>
          ) : (
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6' : 'divide-y divide-white/5'}>
              {agents.map((agent) => (
                <AgentCard 
                  key={agent.id} 
                  agent={agent} 
                  viewMode={viewMode}
                  onClick={() => router.push(`/start/agents/${agent.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// Sub-components
function AgentCard({ 
  agent, 
  viewMode,
  onClick 
}: { 
  agent: Agent; 
  viewMode: 'grid' | 'list';
  onClick: () => void;
}) {
  const getIcon = () => {
    switch (agent.type) {
      case 'voice': return <Phone className="w-5 h-5" />;
      case 'text': return <MessageCircle className="w-5 h-5" />;
      case 'flow': return <Workflow className="w-5 h-5" />;
      default: return <Bot className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'paused': return 'bg-yellow-500';
      case 'draft': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'voice': return 'text-red-400 bg-red-500/10';
      case 'text': return 'text-blue-400 bg-blue-500/10';
      case 'flow': return 'text-purple-400 bg-purple-500/10';
      default: return 'text-gray-400 bg-gray-500/10';
    }
  };

  if (viewMode === 'list') {
    return (
      <button
        onClick={onClick}
        className="w-full p-4 flex items-center gap-4 hover:bg-white/5 transition-colors text-left"
      >
        <div className="w-12 h-12 bg-gradient-to-br from-[#0096ff] to-[#0077cc] rounded-xl flex items-center justify-center text-white flex-shrink-0">
          {getIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h4 className="font-semibold text-white truncate">{agent.name}</h4>
            <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${getTypeColor(agent.type)}`}>
              {agent.type}
            </span>
          </div>
          <p className="text-sm text-gray-500 truncate">{agent.description || 'Sin descripción'}</p>
        </div>

        <div className="flex items-center gap-6 text-sm text-gray-500">
          <div className="flex items-center gap-1.5">
            <MessageCircle className="w-4 h-4" />
            <span>{agent.total_conversations}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${getStatusColor(agent.status)}`} />
            <span className="capitalize">{agent.status}</span>
          </div>
        </div>

        <ChevronRight className="w-5 h-5 text-gray-600" />
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="group bg-[#0f1117] border border-white/5 rounded-xl p-5 text-left hover:border-white/10 hover:bg-[#13161f] transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 bg-gradient-to-br from-[#0096ff] to-[#0077cc] rounded-xl flex items-center justify-center text-white">
          {getIcon()}
        </div>
        <div className={`w-2 h-2 rounded-full ${getStatusColor(agent.status)}`} />
      </div>

      <h4 className="font-semibold text-white mb-1 truncate">{agent.name}</h4>
      <p className="text-sm text-gray-500 mb-4 line-clamp-2">{agent.description || 'Sin descripción'}</p>

      <div className="flex items-center justify-between pt-4 border-t border-white/5">
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <MessageCircle className="w-3.5 h-3.5" />
            {agent.total_conversations}
          </span>
          <span className={`px-2 py-0.5 rounded-full capitalize ${getTypeColor(agent.type)}`}>
            {agent.type}
          </span>
        </div>
        
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <ChevronRight className="w-5 h-5 text-[#0096ff]" />
        </div>
      </div>
    </button>
  );
}
