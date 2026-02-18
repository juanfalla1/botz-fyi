"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/app/supabaseClient";
import { useRouter } from "next/navigation";
import { 
  Home, 
  ChevronDown, 
  Zap,
  Crown,
  Users,
  MessageSquare,
  Phone,
  FileText,
  Settings,
  Plus,
  MoreHorizontal,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Bot,
  LayoutGrid
} from "lucide-react";

interface Agent {
  id: string;
  name: string;
  type: 'voice' | 'text' | 'flow';
  status: 'draft' | 'active' | 'paused';
  description: string;
  total_conversations: number;
  created_at: string;
}

export default function AgentStudio() {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetchUser();
    fetchAgents();
  }, []);

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

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

  const creationCards = [
    {
      id: 'voice',
      title: 'Crear Agente de Voz',
      icon: '📞',
      image: '/agents/voice-agent.png',
    },
    {
      id: 'text',
      title: 'Crear Agente de Texto',
      icon: '💬',
      image: '/agents/text-agent.png',
    },
    {
      id: 'flow',
      title: 'Crear Flujo',
      icon: '⚡',
      image: '/agents/flow-agent.png',
    },
    {
      id: 'notetaker',
      title: 'Configurar Notetaker',
      icon: '📝',
      image: '/agents/notetaker-agent.png',
    },
  ];

  const templates = [
    {
      id: 'lia',
      name: 'Lía',
      category: 'Calificación de leads entrantes',
      avatar: '🎯',
      color: '#a3e635',
      type: 'voice'
    },
    {
      id: 'alex',
      name: 'Alex', 
      category: 'Llamadas en frío salientes',
      avatar: '📞',
      color: '#a3e635',
      type: 'voice'
    },
    {
      id: 'julia',
      name: 'Julia',
      category: 'Asistente Recepcionista',
      avatar: '💬',
      color: '#0096ff',
      type: 'text'
    },
  ];

  return (
    <div className="min-h-screen bg-[#1a1d26] flex">
      {/* Sidebar - Exact Dapta Style */}
      <aside className="w-[260px] bg-[#15181f] border-r border-white/5 flex flex-col">
        {/* Logo */}
        <div className="p-4 flex items-center gap-2">
          <div className="w-8 h-8 bg-[#0096ff] rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">B</span>
          </div>
          <span className="text-white font-bold text-xl">Botz</span>
        </div>

        {/* Workspace Selector */}
        <div className="px-3 pb-4">
          <button className="w-full flex items-center justify-between px-3 py-2.5 bg-[#1e2128] hover:bg-[#252830] rounded-lg transition-colors border border-white/5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-white/10 rounded flex items-center justify-center text-xs">
                <span>🏢</span>
              </div>
              <span className="text-gray-300 text-sm">perdondal</span>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3">
          <button className="w-full flex items-center gap-3 px-3 py-2.5 text-[#a3e635] bg-[#a3e635]/10 rounded-lg mb-1">
            <Home className="w-5 h-5" />
            <span className="font-medium">Inicio</span>
          </button>
        </nav>

        {/* Upgrade Card */}
        <div className="p-3">
          <div className="bg-gradient-to-br from-[#2a2d35] to-[#1e2128] rounded-xl p-4 border border-white/5">
            <h4 className="text-white font-semibold mb-1">¡Conviértete en un Pro!</h4>
            <p className="text-gray-400 text-xs mb-3">
              Desbloquea beneficios exclusivos y funciones premium.
            </p>

            {/* Credits */}
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                <span>Créditos usados</span>
              </div>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-white font-bold">200</span>
                <span className="text-gray-500 text-sm">/ 3K</span>
              </div>
              <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full w-[7%] bg-[#a3e635] rounded-full" />
              </div>
            </div>

            <button className="w-full py-2 border border-[#a3e635] text-[#a3e635] rounded-lg text-sm font-medium hover:bg-[#a3e635]/10 transition-colors">
              Mejorar plan
            </button>
          </div>

          {/* Referral */}
          <div className="mt-3 bg-gradient-to-r from-[#8b5cf6]/20 to-[#ec4899]/20 rounded-xl p-3 border border-white/5">
            <p className="text-white text-sm font-medium mb-1">Refiere y gana $50 🤑</p>
            <button className="bg-[#8b5cf6] text-white text-xs px-3 py-1.5 rounded-lg">
              Recomienda a un amigo
            </button>
          </div>
        </div>

        {/* User */}
        <div className="p-3 border-t border-white/5">
          <div className="flex items-center gap-2 px-2 py-2">
            <div className="w-8 h-8 bg-[#0096ff] rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <span className="text-gray-400 text-sm truncate">
              {user?.email || 'usuario@email.com'}
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-[#1a1d26]">
          <div>
            <h1 className="text-white text-lg font-semibold">
              Hola {user?.email?.split('@')[0] || 'Usuario'}
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto p-8">
          <h2 className="text-white text-2xl font-semibold mb-8">
            ¿Qué quieres crear hoy?
          </h2>

          {/* Creation Cards Grid - 4 columns like Dapta */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            {creationCards.map((card) => (
              <button
                key={card.id}
                onClick={() => router.push(`/start/agents/create?type=${card.id === 'notetaker' ? 'voice' : card.id}`)}
                className="group relative bg-[#22262d] hover:bg-[#2a2e36] rounded-2xl p-6 border border-white/5 hover:border-white/10 transition-all text-left overflow-hidden"
              >
                <div className="text-5xl mb-8">{card.icon}</div>
                <h3 className="text-white font-semibold text-lg">{card.title}</h3>
              </button>
            ))}
          </div>

          {/* Templates Section */}
          <div className="mb-8">
            <h3 className="text-gray-300 text-sm mb-4">
              O inicia con casos de uso populares
            </h3>
            
            <div className="grid grid-cols-3 gap-4">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => router.push(`/start/agents/create?template=${template.id}`)}
                  className="flex items-center gap-4 bg-[#22262d] hover:bg-[#2a2e36] rounded-xl p-4 border border-white/5 hover:border-[#a3e635]/30 transition-all text-left"
                >
                  <div 
                    className="w-14 h-14 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ backgroundColor: `${template.color}20` }}
                  >
                    {template.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-semibold mb-0.5">{template.name}</h4>
                    <p className="text-gray-400 text-sm truncate">{template.category}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-[#22262d] rounded-2xl border border-white/5">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-white font-semibold">Actividad reciente</h3>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Buscar"
                    className="bg-[#1a1d26] border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#0096ff]"
                  />
                </div>
              </div>
            </div>

            {agents.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-[#1a1d26] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Bot className="w-8 h-8 text-gray-600" />
                </div>
                <p className="text-gray-400 mb-2">No hay actividad reciente</p>
                <p className="text-gray-500 text-sm">Tus agentes aparecerán aquí</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {agents.slice(0, 5).map((agent) => (
                  <button
                    key={agent.id}
                    onClick={() => router.push(`/start/agents/${agent.id}`)}
                    className="w-full flex items-center justify-between p-4 hover:bg-[#2a2e36] transition-colors text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-[#0096ff] rounded-lg flex items-center justify-center">
                        {agent.type === 'voice' ? <Phone className="w-5 h-5 text-white" /> :
                         agent.type === 'text' ? <MessageSquare className="w-5 h-5 text-white" /> :
                         <Zap className="w-5 h-5 text-white" />}
                      </div>
                      <div>
                        <h4 className="text-white font-medium">{agent.name}</h4>
                        <p className="text-gray-400 text-sm">{agent.description || 'Sin descripción'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-gray-400 text-sm">
                      <span>{agent.total_conversations} conversaciones</span>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        agent.status === 'active' ? 'bg-green-500/20 text-green-400' :
                        agent.status === 'paused' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {agent.status}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Pagination */}
            <div className="p-4 border-t border-white/5 flex items-center justify-between">
              <span className="text-gray-400 text-sm">
                Mostrando 1 a {Math.min(agents.length, 5)} de {agents.length} entradas
              </span>
              <div className="flex items-center gap-2">
                <button className="p-2 text-gray-400 hover:text-white disabled:opacity-50" disabled>
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button className="px-3 py-1 bg-[#0096ff] text-white rounded text-sm">1</button>
                <button className="p-2 text-gray-400 hover:text-white disabled:opacity-50" disabled>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
