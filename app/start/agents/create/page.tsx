"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/app/supabaseClient";
import { 
  Mic, 
  MessageSquare, 
  Workflow,
  ChevronLeft,
  ChevronRight,
  Check,
  Bot,
  Settings,
  Phone,
  MessageCircle,
  Globe,
  Volume2,
  Brain,
  Sparkles,
  Save,
  Play
} from "lucide-react";

const steps = [
  { id: 1, name: 'Tipo', description: 'Selecciona el tipo de agente' },
  { id: 2, name: 'Personalidad', description: 'Configura el comportamiento' },
  { id: 3, name: 'Conocimiento', description: 'Añade conocimientos' },
  { id: 4, name: 'Integraciones', description: 'Conecta canales' },
  { id: 5, name: 'Revisar', description: 'Verifica y activa' },
];

const agentTypes = [
  {
    id: 'voice',
    name: 'Agente de Voz',
    description: 'Realiza y recibe llamadas telefónicas con conversaciones naturales',
    icon: <Phone className="w-8 h-8" />,
    features: ['Llamadas entrantes/salientes', 'Voz natural', 'Transcripción', 'Grabación'],
    color: 'from-red-500/20 to-red-600/20',
    borderColor: 'border-red-500/30'
  },
  {
    id: 'text',
    name: 'Agente de Texto',
    description: 'Responde mensajes en WhatsApp, web y otras plataformas',
    icon: <MessageCircle className="w-8 h-8" />,
    features: ['WhatsApp', 'Web chat', 'Respuestas instantáneas', 'Multilingüe'],
    color: 'from-blue-500/20 to-blue-600/20',
    borderColor: 'border-blue-500/30'
  },
  {
    id: 'flow',
    name: 'Flujo Automatizado',
    description: 'Crea automatizaciones visuales con lógica condicional',
    icon: <Workflow className="w-8 h-8" />,
    features: ['Editor visual', 'Condiciones', 'Integraciones', 'Triggers'],
    color: 'from-purple-500/20 to-purple-600/20',
    borderColor: 'border-purple-500/30'
  }
];

const personalities = [
  { id: 'professional', name: 'Profesional', description: 'Formal, directo, eficiente', tone: 'formal' },
  { id: 'friendly', name: 'Amigable', description: 'Cálido, cercano, conversacional', tone: 'casual' },
  { id: 'enthusiastic', name: 'Entusiasta', description: 'Energético, motivador, positivo', tone: 'energetic' },
  { id: 'calm', name: 'Tranquilo', description: 'Sereno, paciente, empático', tone: 'calm' },
];

const voices = [
  { id: 'alloy', name: 'Alloy', gender: 'neutral', preview: 'Voz versátil y natural' },
  { id: 'echo', name: 'Echo', gender: 'male', preview: 'Voz masculina cálida' },
  { id: 'fable', name: 'Fable', gender: 'neutral', preview: 'Voz expresiva y dinámica' },
  { id: 'onyx', name: 'Onyx', gender: 'male', preview: 'Voz masculina profesional' },
  { id: 'nova', name: 'Nova', gender: 'female', preview: 'Voz femenina amigable' },
  { id: 'shimmer', name: 'Shimmer', gender: 'female', preview: 'Voz femenina clara' },
];

export default function CreateAgentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeParam = searchParams.get('type');
  const templateParam = searchParams.get('template');
  
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [agentData, setAgentData] = useState({
    name: '',
    type: typeParam || 'voice',
    description: '',
    personality: 'professional',
    voice: 'alloy',
    language: 'es',
    systemPrompt: '',
    knowledge: [] as string[],
    integrations: [] as string[],
    avatar: null as string | null,
  });

  // Load template if provided
  useEffect(() => {
    if (templateParam) {
      loadTemplate(templateParam);
    }
  }, [templateParam]);

  const loadTemplate = async (templateId: string) => {
    // Pre-fill based on template
    const templates: Record<string, any> = {
      'lia': {
        name: 'Lía - Calificadora de Leads',
        type: 'voice',
        description: 'Califica leads entrantes al instante',
        personality: 'professional',
        systemPrompt: 'Eres Lía, una representante de ventas amigable y profesional. Tu trabajo es calificar leads entrantes haciendo preguntas sobre su interés, presupuesto y timeline.',
      },
      'alex': {
        name: 'Alex - Prospección',
        type: 'voice',
        description: 'Realiza llamadas de prospección en frío',
        personality: 'enthusiastic',
        systemPrompt: 'Eres Alex, un vendedor energético y persuasivo. Realizas llamadas de prospección identificando oportunidades de venta.',
      },
      'julia': {
        name: 'Julia - Recepcionista',
        type: 'text',
        description: 'Atiende consultas y agenda citas',
        personality: 'friendly',
        systemPrompt: 'Eres Julia, una asistente virtual amable y servicial. Ayudas a los clientes con sus consultas y agendas citas.',
      }
    };

    const template = templates[templateId];
    if (template) {
      setAgentData(prev => ({ ...prev, ...template }));
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      router.push('/start/agents');
    }
  };

  const handleCreate = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user');

      const { data, error } = await supabase
        .from('ai_agents')
        .insert({
          name: agentData.name,
          type: agentData.type,
          description: agentData.description,
          configuration: {
            personality: agentData.personality,
            language: agentData.language,
            system_prompt: agentData.systemPrompt,
          },
          voice_settings: agentData.type === 'voice' ? {
            voice_id: agentData.voice,
          } : null,
          created_by: user.id,
          status: 'draft',
        })
        .select()
        .single();

      if (error) throw error;

      router.push(`/start/agents/${data.id}`);
    } catch (error) {
      console.error('Error creating agent:', error);
      alert('Error al crear el agente');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">
                ¿Qué tipo de agente quieres crear?
              </h3>
              <p className="text-gray-400">
                Selecciona el tipo que mejor se adapte a tus necesidades
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {agentTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setAgentData({ ...agentData, type: type.id })}
                  className={`relative p-6 rounded-2xl border-2 text-left transition-all ${
                    agentData.type === type.id
                      ? `${type.borderColor} bg-white/10`
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  {agentData.type === type.id && (
                    <div className="absolute top-4 right-4 w-6 h-6 bg-[#0096ff] rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                  
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${type.color} flex items-center justify-center mb-4 text-white`}>
                    {type.icon}
                  </div>
                  
                  <h4 className="text-lg font-semibold text-white mb-2">{type.name}</h4>
                  <p className="text-sm text-gray-400 mb-4">{type.description}</p>
                  
                  <ul className="space-y-1">
                    {type.features.map((feature, idx) => (
                      <li key={idx} className="text-xs text-gray-500 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-[#0096ff]" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Configura la personalidad
              </h3>
              <p className="text-gray-400">
                Define cómo se comportará y comunicará tu agente
              </p>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Nombre del agente</label>
              <input
                type="text"
                value={agentData.name}
                onChange={(e) => setAgentData({ ...agentData, name: e.target.value })}
                placeholder="Ej: Lía - Calificadora de Leads"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-[#0096ff] focus:outline-none"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Descripción</label>
              <textarea
                value={agentData.description}
                onChange={(e) => setAgentData({ ...agentData, description: e.target.value })}
                placeholder="Describe qué hace este agente..."
                rows={3}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-[#0096ff] focus:outline-none resize-none"
              />
            </div>

            {/* Personality */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-white">Personalidad</label>
              <div className="grid grid-cols-2 gap-3">
                {personalities.map((personality) => (
                  <button
                    key={personality.id}
                    onClick={() => setAgentData({ ...agentData, personality: personality.id })}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      agentData.personality === personality.id
                        ? 'border-[#0096ff] bg-[#0096ff]/10'
                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <h5 className="font-medium text-white mb-1">{personality.name}</h5>
                    <p className="text-xs text-gray-400">{personality.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Voice Selection (only for voice agents) */}
            {agentData.type === 'voice' && (
              <div className="space-y-3">
                <label className="text-sm font-medium text-white flex items-center gap-2">
                  <Volume2 className="w-4 h-4" />
                  Voz
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {voices.map((voice) => (
                    <button
                      key={voice.id}
                      onClick={() => setAgentData({ ...agentData, voice: voice.id })}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        agentData.voice === voice.id
                          ? 'border-[#0096ff] bg-[#0096ff]/10'
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-white text-sm">{voice.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          voice.gender === 'male' ? 'bg-blue-500/20 text-blue-400' :
                          voice.gender === 'female' ? 'bg-pink-500/20 text-pink-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {voice.gender === 'neutral' ? 'Neutral' : voice.gender === 'male' ? 'M' : 'F'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">{voice.preview}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Conocimiento y comportamiento
              </h3>
              <p className="text-gray-400">
                Define las instrucciones y conocimientos de tu agente
              </p>
            </div>

            {/* System Prompt */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white flex items-center gap-2">
                <Brain className="w-4 h-4 text-[#0096ff]" />
                Instrucciones del sistema (System Prompt)
              </label>
              <p className="text-xs text-gray-500">
                Estas instrucciones definen el comportamiento base de tu agente. Sé específico sobre su rol, objetivos y restricciones.
              </p>
              <textarea
                value={agentData.systemPrompt}
                onChange={(e) => setAgentData({ ...agentData, systemPrompt: e.target.value })}
                placeholder={`Ejemplo:
Eres un asistente virtual especializado en atención al cliente para una empresa inmobiliaria.

Tu objetivo es:
- Responder preguntas sobre propiedades disponibles
- Agendar citas para visitas
- Calificar leads según su presupuesto y necesidades

Siempre sé amable, profesional y trata de ayudar al cliente a encontrar lo que busca.`}
                rows={10}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:border-[#0096ff] focus:outline-none resize-none font-mono text-sm"
              />
            </div>

            {/* Knowledge Base */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-white">Base de conocimientos</label>
              <p className="text-xs text-gray-500">
                Añade información específica que el agente debe conocer (productos, servicios, FAQs, etc.)
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button className="p-4 rounded-xl border border-dashed border-white/20 bg-white/5 hover:bg-white/10 transition-all text-center">
                  <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <span className="text-xl">📄</span>
                  </div>
                  <p className="text-sm text-white font-medium">Subir documentos</p>
                  <p className="text-xs text-gray-500">PDF, Word, TXT</p>
                </button>
                
                <button className="p-4 rounded-xl border border-dashed border-white/20 bg-white/5 hover:bg-white/10 transition-all text-center">
                  <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <span className="text-xl">🌐</span>
                  </div>
                  <p className="text-sm text-white font-medium">Importar desde web</p>
                  <p className="text-xs text-gray-500">Scrapear sitio web</p>
                </button>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Integraciones y canales
              </h3>
              <p className="text-gray-400">
                Selecciona dónde estará disponible tu agente
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* WhatsApp */}
              <IntegrationCard
                icon={<MessageCircle className="w-6 h-6" />}
                name="WhatsApp Business"
                description="Responde mensajes de WhatsApp automáticamente"
                enabled={agentData.integrations.includes('whatsapp')}
                onToggle={() => {
                  const newIntegrations = agentData.integrations.includes('whatsapp')
                    ? agentData.integrations.filter(i => i !== 'whatsapp')
                    : [...agentData.integrations, 'whatsapp'];
                  setAgentData({ ...agentData, integrations: newIntegrations });
                }}
              />
              
              {/* Phone */}
              {agentData.type === 'voice' && (
                <IntegrationCard
                  icon={<Phone className="w-6 h-6" />}
                  name="Teléfono"
                  description="Número telefónico dedicado"
                  enabled={agentData.integrations.includes('phone')}
                  onToggle={() => {
                    const newIntegrations = agentData.integrations.includes('phone')
                      ? agentData.integrations.filter(i => i !== 'phone')
                      : [...agentData.integrations, 'phone'];
                    setAgentData({ ...agentData, integrations: newIntegrations });
                  }}
                />
              )}
              
              {/* Web Chat */}
              <IntegrationCard
                icon={<Globe className="w-6 h-6" />}
                name="Web Chat"
                description="Widget para tu sitio web"
                enabled={agentData.integrations.includes('web')}
                onToggle={() => {
                  const newIntegrations = agentData.integrations.includes('web')
                    ? agentData.integrations.filter(i => i !== 'web')
                    : [...agentData.integrations, 'web'];
                  setAgentData({ ...agentData, integrations: newIntegrations });
                }}
              />
              
              {/* API */}
              <IntegrationCard
                icon={<Settings className="w-6 h-6" />}
                name="API"
                description="Integración programática"
                enabled={agentData.integrations.includes('api')}
                onToggle={() => {
                  const newIntegrations = agentData.integrations.includes('api')
                    ? agentData.integrations.filter(i => i !== 'api')
                    : [...agentData.integrations, 'api'];
                  setAgentData({ ...agentData, integrations: newIntegrations });
                }}
              />
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Revisar y activar
              </h3>
              <p className="text-gray-400">
                Verifica la configuración de tu agente antes de activarlo
              </p>
            </div>

            {/* Summary Card */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-4 pb-4 border-b border-white/10">
                <div className="w-16 h-16 bg-gradient-to-br from-[#0096ff] to-[#0077cc] rounded-2xl flex items-center justify-center text-white text-2xl">
                  {agentData.type === 'voice' ? <Phone className="w-8 h-8" /> :
                   agentData.type === 'text' ? <MessageCircle className="w-8 h-8" /> :
                   <Workflow className="w-8 h-8" />}
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-white">{agentData.name || 'Sin nombre'}</h4>
                  <p className="text-sm text-gray-400">{agentData.description || 'Sin descripción'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Tipo:</span>
                  <span className="ml-2 text-white capitalize">{agentData.type}</span>
                </div>
                <div>
                  <span className="text-gray-500">Personalidad:</span>
                  <span className="ml-2 text-white capitalize">{agentData.personality}</span>
                </div>
                <div>
                  <span className="text-gray-500">Idioma:</span>
                  <span className="ml-2 text-white uppercase">{agentData.language}</span>
                </div>
                {agentData.type === 'voice' && (
                  <div>
                    <span className="text-gray-500">Voz:</span>
                    <span className="ml-2 text-white capitalize">{agentData.voice}</span>
                  </div>
                )}
                <div>
                  <span className="text-gray-500">Integraciones:</span>
                  <span className="ml-2 text-white">
                    {agentData.integrations.length > 0 
                      ? agentData.integrations.join(', ') 
                      : 'Ninguna'}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10">
                <span className="text-gray-500 text-sm">Instrucciones:</span>
                <p className="mt-2 text-sm text-gray-300 bg-white/5 p-3 rounded-lg">
                  {agentData.systemPrompt || 'Sin instrucciones personalizadas'}
                </p>
              </div>
            </div>

            {/* Test button */}
            <div className="flex items-center gap-4">
              <button className="flex-1 px-6 py-3 bg-white/10 border border-white/20 rounded-xl text-white font-medium hover:bg-white/20 transition-all flex items-center justify-center gap-2">
                <Play className="w-5 h-5" />
                Probar agente
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0f1c] via-[#0f172a] to-[#1e293b]">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              Volver
            </button>
            
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-[#0096ff] to-[#0077cc] rounded-xl flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <span className="font-semibold text-white">Crear Agente</span>
            </div>
            
            <div className="w-20" /> {/* Spacer for centering */}
          </div>
        </div>
      </header>

      {/* Stepper */}
      <div className="border-b border-white/10 bg-black/10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                      currentStep >= step.id
                        ? 'bg-[#0096ff] text-white'
                        : 'bg-white/10 text-gray-500'
                    }`}
                  >
                    {currentStep > step.id ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      step.id
                    )}
                  </div>
                  <span className={`mt-2 text-xs ${
                    currentStep >= step.id ? 'text-white' : 'text-gray-500'
                  }`}>
                    {step.name}
                  </span>
                </div>
                
                {index < steps.length - 1 && (
                  <div className={`w-16 md:w-24 h-0.5 mx-2 md:mx-4 ${
                    currentStep > step.id ? 'bg-[#0096ff]' : 'bg-white/10'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8">
          {renderStepContent()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-8">
          <button
            onClick={handleBack}
            className="px-6 py-3 text-gray-400 hover:text-white font-medium transition-colors"
          >
            Anterior
          </button>
          
          {currentStep < steps.length ? (
            <button
              onClick={handleNext}
              className="px-8 py-3 bg-gradient-to-r from-[#0096ff] to-[#0077cc] text-white rounded-xl font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              Siguiente
              <ChevronRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={loading}
              className="px-8 py-3 bg-gradient-to-r from-[#0096ff] to-[#0077cc] text-white rounded-xl font-medium hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Crear Agente
                </>
              )}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

// Sub-components
function IntegrationCard({ 
  icon, 
  name, 
  description, 
  enabled, 
  onToggle 
}: { 
  icon: React.ReactNode;
  name: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`p-4 rounded-xl border text-left transition-all ${
        enabled
          ? 'border-[#0096ff] bg-[#0096ff]/10'
          : 'border-white/10 bg-white/5 hover:bg-white/10'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
          enabled ? 'bg-[#0096ff] text-white' : 'bg-white/10 text-gray-400'
        }`}>
          {icon}
        </div>
        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
          enabled ? 'border-[#0096ff] bg-[#0096ff]' : 'border-gray-500'
        }`}>
          {enabled && <Check className="w-4 h-4 text-white" />}
        </div>
      </div>
      <h5 className="font-medium text-white mb-1">{name}</h5>
      <p className="text-xs text-gray-400">{description}</p>
    </button>
  );
}
