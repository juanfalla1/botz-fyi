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
  Edit3
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
  avatar_url?: string;
  tags: string[];
}

export default function AgentStudio() {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'voice' | 'text' | 'flow'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [credits, setCredits] = useState({ used: 0, limit: 3000 });

  useEffect(() => {
    fetchAgents();
    fetchTemplates();
    fetchCredits();
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
    }
  };

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('agent_templates')
        .select('*')
        .eq('is_active', true)
        .order('usage_count', { ascending: false })
        .limit(6);

      if (error) throw error;
      
      // If no templates in DB, use defaults
      if (!data || data.length === 0) {
        setTemplates([
          {
            id: 'lia',
            name: 'Lía',
            type: 'voice',
            category: 'Calificación de leads',
            description: 'Califica leads entrantes al instante con conversaciones naturales',
            tags: ['ventas', 'calificación', 'voz']
          },
          {
            id: 'alex',
            name: 'Alex',
            type: 'voice',
            category: 'Llamadas en frío',
            description: 'Realiza llamadas de prospección con seguimiento inteligente',
            tags: ['prospección', 'ventas', 'voz']
          },
          {
            id: 'julia',
            name: 'Julia',
            type: 'text',
            category: 'Asistente Recepcionista',
            description: 'Atiende consultas y agenda citas automáticamente',
            tags: ['atención', 'agenda', 'chat']
          }
        ]);
      } else {
        setTemplates(data);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const fetchCredits = async () => {
    // Mock for now - will connect to real credits system later
    setCredits({ used: 200, limit: 3000 });
  };

  const filteredAgents = agents.filter(agent => 
    activeTab === 'all' || agent.type === activeTab
  );

  const getAgentIcon = (type: string) => {
    switch (type) {
      case 'voice': return <Mic className="w-5 h-5" />;
      case 'text': return <MessageSquare className="w-5 h-5" />;
      case 'flow': return <Workflow className="w-5 h-5" />;
      default: return <Bot className="w-5 h-5" />;
    }
  };

  const getAgentColor = (type: string) => {
    switch (type) {
      case 'voice': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'text': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'flow': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0f1c] via-[#0f172a] to-[#1e293b]">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-[#0096ff] to-[#0077cc] rounded-xl flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Agent Studio</h1>
                <p className="text-sm text-gray-400">Crea y gestiona tus agentes IA</p>
              </div>
            </div>
            
            {/* Credits */}
            <div className="flex items-center gap-6">
              <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-2">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <span>Créditos usados</span>
                </div>
                <div className="mt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-semibold">{credits.used.toLocaleString()}</span>
                    <span className="text-gray-500">/ {credits.limit.toLocaleString()}</span>
                  </div>
                  <div className="w-48 h-2 bg-gray-700 rounded-full mt-2 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[#0096ff] to-[#00d4ff] rounded-full transition-all"
                      style={{ width: `${(credits.used / credits.limit) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
              
              <button className="bg-gradient-to-r from-[#0096ff] to-[#0077cc] text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity">
                Mejorar plan
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">
            Hola, ¿qué quieres crear hoy?
          </h2>
          <p className="text-gray-400">
            Construye agentes IA que trabajen 24/7 para escalar tu operación
          </p>
        </div>

        {/* Create Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          <CreateCard
            icon={<Mic className="w-8 h-8" />}
            title="Crear Agente de Voz"
            description="Agentes que realizan y reciben llamadas"
            color="from-red-500/20 to-red-600/20"
            onClick={() => router.push('/start/agents/create?type=voice')}
          />
          <CreateCard
            icon={<MessageSquare className="w-8 h-8" />}
            title="Crear Agente de Texto"
            description="Chatbots para WhatsApp y web"
            color="from-blue-500/20 to-blue-600/20"
            onClick={() => router.push('/start/agents/create?type=text')}
          />
          <CreateCard
            icon={<Workflow className="w-8 h-8" />}
            title="Crear Flujo"
            description="Automatizaciones con lógica visual"
            color="from-purple-500/20 to-purple-600/20"
            onClick={() => router.push('/start/agents/create?type=flow')}
          />
          <CreateCard
            icon={<Settings className="w-8 h-8" />}
            title="Configurar Notetaker"
            description="Transcripción y análisis de llamadas"
            color="from-green-500/20 to-green-600/20"
            onClick={() => router.push('/start/agents/notetaker')}
          />
        </div>

        {/* Templates Section */}
        <div className="mb-12">
          <h3 className="text-lg font-semibold text-white mb-4">
            O inicia con casos de uso populares
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onClick={() => router.push(`/start/agents/create?template=${template.id}`)}
              />
            ))}
          </div>
        </div>

        {/* My Agents Section */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">Mis Agentes</h3>
            
            {/* Tabs */}
            <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
              {(['all', 'voice', 'text', 'flow'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab
                      ? 'bg-[#0096ff] text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {tab === 'all' ? 'Todos' : 
                   tab === 'voice' ? 'Voz' : 
                   tab === 'text' ? 'Texto' : 'Flujos'}
                </button>
              ))}
            </div>
          </div>

          {filteredAgents.length === 0 ? (
            <div className="text-center py-12">
              <Bot className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-white mb-2">
                No tienes agentes {activeTab !== 'all' ? `de ${activeTab}` : ''} aún
              </h4>
              <p className="text-gray-400 mb-4">
                Crea tu primer agente usando las opciones de arriba
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-[#0096ff] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#0077cc] transition-colors inline-flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Crear Agente
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAgents.map((agent) => (
                <AgentCard 
                  key={agent.id} 
                  agent={agent} 
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
function CreateCard({ 
  icon, 
  title, 
  description, 
  color, 
  onClick 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string; 
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`group relative overflow-hidden bg-gradient-to-br ${color} border border-white/10 rounded-2xl p-6 text-left hover:border-white/20 transition-all hover:scale-[1.02]`}
    >
      <div className="relative z-10">
        <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center mb-4 text-white">
          {icon}
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        <p className="text-sm text-gray-300">{description}</p>
      </div>
      <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
          <ChevronRight className="w-5 h-5 text-white" />
        </div>
      </div>
    </button>
  );
}

function TemplateCard({ 
  template, 
  onClick 
}: { 
  template: Template; 
  onClick: () => void;
}) {
  const getIcon = () => {
    switch (template.type) {
      case 'voice': return <Phone className="w-6 h-6" />;
      case 'text': return <MessageCircle className="w-6 h-6" />;
      default: return <Bot className="w-6 h-6" />;
    }
  };

  const getColor = () => {
    switch (template.type) {
      case 'voice': return 'bg-red-500 text-white';
      case 'text': return 'bg-blue-500 text-white';
      default: return 'bg-purple-500 text-white';
    }
  };

  return (
    <button
      onClick={onClick}
      className="group bg-white/5 border border-white/10 rounded-xl p-4 text-left hover:bg-white/10 transition-all"
    >
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 ${getColor()} rounded-xl flex items-center justify-center flex-shrink-0`}>
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-white mb-1">{template.name}</h4>
          <p className="text-xs text-[#0096ff] mb-2">{template.category}</p>
          <p className="text-sm text-gray-400 line-clamp-2">{template.description}</p>
        </div>
      </div>
    </button>
  );
}

function AgentCard({ 
  agent, 
  onClick 
}: { 
  agent: Agent; 
  onClick: () => void;
}) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'paused': return 'bg-yellow-500';
      case 'draft': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getAgentIcon = (type: string) => {
    switch (type) {
      case 'voice': return <Mic className="w-5 h-5" />;
      case 'text': return <MessageSquare className="w-5 h-5" />;
      case 'flow': return <Workflow className="w-5 h-5" />;
      default: return <Bot className="w-5 h-5" />;
    }
  };

  return (
    <button
      onClick={onClick}
      className="group bg-white/5 border border-white/10 rounded-xl p-4 text-left hover:bg-white/10 transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-[#0096ff] to-[#0077cc] rounded-xl flex items-center justify-center text-white">
            {getAgentIcon(agent.type)}
          </div>
          <div>
            <h4 className="font-semibold text-white">{agent.name}</h4>
            <div className="flex items-center gap-2 mt-1">
              <span className={`w-2 h-2 rounded-full ${getStatusColor(agent.status)}`} />
              <span className="text-xs text-gray-400 capitalize">{agent.status}</span>
            </div>
          </div>
        </div>
        <button className="opacity-0 group-hover:opacity-100 p-2 hover:bg-white/10 rounded-lg transition-all">
          <MoreVertical className="w-4 h-4 text-gray-400" />
        </button>
      </div>
      
      <p className="text-sm text-gray-400 mb-4 line-clamp-2">
        {agent.description || 'Sin descripción'}
      </p>
      
      <div className="flex items-center justify-between pt-3 border-t border-white/10">
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <MessageCircle className="w-4 h-4" />
            {agent.total_conversations}
          </span>
          <span className="flex items-center gap-1">
            <BarChart3 className="w-4 h-4" />
            {new Date(agent.created_at).toLocaleDateString()}
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          {agent.status === 'active' ? (
            <Pause className="w-4 h-4 text-yellow-400" />
          ) : (
            <Play className="w-4 h-4 text-green-400" />
          )}
        </div>
      </div>
    </button>
  );
}
