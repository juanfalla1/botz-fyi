"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/app/supabaseClient";
import {
  ChevronLeft,
  Bot,
  Mic,
  MessageSquare,
  Workflow,
  Play,
  Pause,
  Settings,
  BarChart3,
  Users,
  MessageCircle,
  Clock,
  MoreVertical,
  Edit3,
  Trash2,
  Phone,
  Globe,
  Download,
  Filter,
  Search,
  RefreshCw
} from "lucide-react";

interface Agent {
  id: string;
  name: string;
  type: 'voice' | 'text' | 'flow';
  status: 'draft' | 'active' | 'paused';
  description: string;
  configuration: any;
  voice_settings?: any;
  total_conversations: number;
  total_messages: number;
  credits_used: number;
  created_at: string;
}

interface Conversation {
  id: string;
  contact_name: string;
  contact_phone?: string;
  channel: string;
  status: string;
  message_count: number;
  duration_seconds?: number;
  started_at: string;
}

export default function AgentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const agentId = params.id as string;
  
  const [agent, setAgent] = useState<Agent | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'conversations' | 'settings'>('overview');

  useEffect(() => {
    if (agentId) {
      fetchAgent();
      fetchConversations();
    }
  }, [agentId]);

  const fetchAgent = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_agents')
        .select('*')
        .eq('id', agentId)
        .single();

      if (error) throw error;
      setAgent(data);
    } catch (error) {
      console.error('Error fetching agent:', error);
    }
  };

  const fetchConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('agent_conversations')
        .select('*')
        .eq('agent_id', agentId)
        .order('started_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setConversations(data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      setLoading(false);
    }
  };

  const toggleAgentStatus = async () => {
    if (!agent) return;
    
    const newStatus = agent.status === 'active' ? 'paused' : 'active';
    try {
      const { error } = await supabase
        .from('ai_agents')
        .update({ status: newStatus })
        .eq('id', agentId);

      if (error) throw error;
      setAgent({ ...agent, status: newStatus });
    } catch (error) {
      console.error('Error updating agent status:', error);
    }
  };

  const getAgentIcon = () => {
    if (!agent) return <Bot className="w-6 h-6" />;
    switch (agent.type) {
      case 'voice': return <Mic className="w-6 h-6" />;
      case 'text': return <MessageSquare className="w-6 h-6" />;
      case 'flow': return <Workflow className="w-6 h-6" />;
      default: return <Bot className="w-6 h-6" />;
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0f1c] via-[#0f172a] to-[#1e293b] flex items-center justify-center">
        <div className="flex items-center gap-3 text-white">
          <RefreshCw className="w-6 h-6 animate-spin" />
          Cargando agente...
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0f1c] via-[#0f172a] to-[#1e293b] flex items-center justify-center">
        <div className="text-center">
          <Bot className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Agente no encontrado</h2>
          <button
            onClick={() => router.push('/start/agents')}
            className="text-[#0096ff] hover:underline"
          >
            Volver a Agentes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0f1c] via-[#0f172a] to-[#1e293b]">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/start/agents')}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
                Volver
              </button>
              
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-[#0096ff] to-[#0077cc] rounded-xl flex items-center justify-center text-white">
                  {getAgentIcon()}
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">{agent.name}</h1>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${getStatusColor(agent.status)}`} />
                    <span className="text-sm text-gray-400 capitalize">{agent.status}</span>
                    <span className="text-gray-600">•</span>
                    <span className="text-sm text-gray-400 capitalize">{agent.type}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={toggleAgentStatus}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  agent.status === 'active'
                    ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/30'
                    : 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
                }`}
              >
                {agent.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {agent.status === 'active' ? 'Pausar' : 'Activar'}
              </button>
              
              <button className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all">
                <Edit3 className="w-5 h-5" />
              </button>
              
              <button className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-white/10 bg-black/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-1">
            {(['overview', 'conversations', 'settings'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-all ${
                  activeTab === tab
                    ? 'border-[#0096ff] text-white'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                {tab === 'overview' && 'Resumen'}
                {tab === 'conversations' && 'Conversaciones'}
                {tab === 'settings' && 'Configuración'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatCard
                icon={<MessageCircle className="w-5 h-5" />}
                label="Conversaciones"
                value={agent.total_conversations.toString()}
                trend="+12%"
              />
              <StatCard
                icon={<Users className="w-5 h-5" />}
                label="Mensajes"
                value={agent.total_messages.toString()}
                trend="+8%"
              />
              <StatCard
                icon={<Clock className="w-5 h-5" />}
                label="Tiempo promedio"
                value="4m 32s"
                trend="-5%"
              />
              <StatCard
                icon={<BarChart3 className="w-5 h-5" />}
                label="Créditos usados"
                value={agent.credits_used.toString()}
                trend="+23%"
              />
            </div>

            {/* Recent Activity */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">Actividad reciente</h3>
                <button
                  onClick={() => setActiveTab('conversations')}
                  className="text-[#0096ff] text-sm hover:underline"
                >
                  Ver todas
                </button>
              </div>
              
              {conversations.length === 0 ? (
                <div className="text-center py-12">
                  <MessageCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">No hay conversaciones aún</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Las conversaciones aparecerán aquí cuando los usuarios interactúen con el agente
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {conversations.slice(0, 5).map((conv) => (
                    <ConversationRow key={conv.id} conversation={conv} />
                  ))}
                </div>
              )}
            </div>

            {/* Configuration Summary */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Configuración</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <ConfigItem
                  label="Personalidad"
                  value={agent.configuration?.personality || 'Profesional'}
                />
                <ConfigItem
                  label="Idioma"
                  value={agent.configuration?.language?.toUpperCase() || 'ES'}
                />
                {agent.type === 'voice' && (
                  <ConfigItem
                    label="Voz"
                    value={agent.voice_settings?.voice_id || 'Default'}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'conversations' && (
          <div className="bg-white/5 border border-white/10 rounded-2xl">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar conversaciones..."
                    className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:border-[#0096ff] focus:outline-none"
                  />
                </div>
                <button className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-400 hover:text-white transition-colors">
                  <Filter className="w-4 h-4" />
                  Filtrar
                </button>
              </div>
              <button className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-400 hover:text-white transition-colors">
                <Download className="w-4 h-4" />
                Exportar
              </button>
            </div>
            
            <div className="divide-y divide-white/10">
              {conversations.length === 0 ? (
                <div className="text-center py-12">
                  <MessageCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">No hay conversaciones aún</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <ConversationRow key={conv.id} conversation={conv} detailed />
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-2xl">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-6">Configuración del agente</h3>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white">Nombre</label>
                  <input
                    type="text"
                    defaultValue={agent.name}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-[#0096ff] focus:outline-none"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white">Descripción</label>
                  <textarea
                    defaultValue={agent.description}
                    rows={3}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-[#0096ff] focus:outline-none resize-none"
                  />
                </div>
                
                <div className="pt-4 border-t border-white/10">
                  <button className="w-full py-3 bg-[#0096ff] text-white rounded-lg font-medium hover:bg-[#0077cc] transition-colors">
                    Guardar cambios
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Sub-components
function StatCard({ icon, label, value, trend }: { icon: React.ReactNode; label: string; value: string; trend: string }) {
  const isPositive = trend.startsWith('+');
  
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-[#0096ff]/10 rounded-lg flex items-center justify-center text-[#0096ff]">
          {icon}
        </div>
        <span className="text-sm text-gray-400">{label}</span>
      </div>
      <div className="flex items-end justify-between">
        <span className="text-2xl font-bold text-white">{value}</span>
        <span className={`text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
          {trend}
        </span>
      </div>
    </div>
  );
}

function ConversationRow({ conversation, detailed = false }: { conversation: Conversation; detailed?: boolean }) {
  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'voice': return <Phone className="w-4 h-4" />;
      case 'whatsapp': return <MessageCircle className="w-4 h-4" />;
      case 'web': return <Globe className="w-4 h-4" />;
      default: return <MessageCircle className="w-4 h-4" />;
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className={`flex items-center justify-between p-4 hover:bg-white/5 transition-colors ${detailed ? '' : ''}`}>
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center text-gray-400">
          {getChannelIcon(conversation.channel)}
        </div>
        <div>
          <p className="font-medium text-white">{conversation.contact_name || 'Desconocido'}</p>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span>{conversation.contact_phone || 'Sin teléfono'}</span>
            <span>•</span>
            <span>{conversation.message_count} mensajes</span>
            {detailed && (
              <>
                <span>•</span>
                <span>{formatDuration(conversation.duration_seconds)}</span>
              </>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-500">
          {new Date(conversation.started_at).toLocaleString()}
        </span>
        <button className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all">
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function ConfigItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-3">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-sm text-white font-medium capitalize">{value}</p>
    </div>
  );
}
