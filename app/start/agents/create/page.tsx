"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/app/supabaseClient";
import {
  ChevronLeft,
  Check,
  Mic,
  MessageSquare,
  Workflow,
  Sparkles,
  Globe,
  Volume2,
  Brain,
  Phone,
  MessageCircle,
  Settings,
  Save,
  Play,
  ArrowRight,
  ArrowLeft,
  X,
  Info
} from "lucide-react";

const steps = [
  { id: 1, name: 'Tipo', description: 'Selecciona el tipo' },
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
    icon: '📞',
    features: ['Llamadas entrantes/salientes', 'Voz natural', 'Transcripción', 'Grabación'],
    color: 'red',
    popular: true
  },
  {
    id: 'text',
    name: 'Agente de Texto',
    description: 'Responde mensajes en WhatsApp, web y otras plataformas',
    icon: '💬',
    features: ['WhatsApp', 'Web chat', 'Respuestas instantáneas', 'Multilingüe'],
    color: 'blue'
  },
  {
    id: 'flow',
    name: 'Flujo Automatizado',
    description: 'Crea automatizaciones visuales con lógica condicional',
    icon: '⚡',
    features: ['Editor visual', 'Condiciones', 'Integraciones', 'Triggers'],
    color: 'purple'
  }
];

const personalities = [
  { id: 'professional', name: 'Profesional', description: 'Formal, directo, eficiente', emoji: '👔' },
  { id: 'friendly', name: 'Amigable', description: 'Cálido, cercano, conversacional', emoji: '🤝' },
  { id: 'enthusiastic', name: 'Entusiasta', description: 'Energético, motivador, positivo', emoji: '⚡' },
  { id: 'calm', name: 'Tranquilo', description: 'Sereno, paciente, empático', emoji: '🧘' },
];

const voices = [
  { id: 'alloy', name: 'Alloy', gender: 'neutral', preview: 'Voz versátil' },
  { id: 'echo', name: 'Echo', gender: 'male', preview: 'Masculina cálida' },
  { id: 'fable', name: 'Fable', gender: 'neutral', preview: 'Expresiva' },
  { id: 'onyx', name: 'Onyx', gender: 'male', preview: 'Profesional' },
  { id: 'nova', name: 'Nova', gender: 'female', preview: 'Amigable' },
  { id: 'shimmer', name: 'Shimmer', gender: 'female', preview: 'Clara' },
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
  });

  useEffect(() => {
    if (templateParam) loadTemplate(templateParam);
  }, [templateParam]);

  const loadTemplate = (templateId: string) => {
    const templates: Record<string, any> = {
      'lia': {
        name: 'Lía - Calificadora de Leads',
        type: 'voice',
        description: 'Califica leads entrantes con conversaciones naturales',
        personality: 'professional',
        voice: 'nova',
        systemPrompt: 'Eres Lía, una representante de ventas profesional y amigable. Tu objetivo es calificar leads entrantes mediante preguntas estratégicas sobre su presupuesto, timeline y necesidades específicas.',
      },
      'alex': {
        name: 'Alex - Prospección',
        type: 'voice',
        description: 'Realiza llamadas de prospección en frío',
        personality: 'enthusiastic',
        voice: 'echo',
        systemPrompt: 'Eres Alex, un vendedor energético y persuasivo. Realizas prospección telefónica identificando oportunidades de negocio de manera respetuosa pero persistente.',
      },
      'julia': {
        name: 'Julia - Asistente Virtual',
        type: 'text',
        description: 'Atiende consultas y agenda citas automáticamente',
        personality: 'friendly',
        systemPrompt: 'Eres Julia, una asistente virtual amable y servicial. Ayudas a los clientes con sus consultas, proporcionas información y agendas citas de manera eficiente.',
      }
    };
    
    const template = templates[templateId];
    if (template) setAgentData(prev => ({ ...prev, ...template }));
  };

  const handleNext = () => {
    if (currentStep < steps.length) setCurrentStep(currentStep + 1);
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
          voice_settings: agentData.type === 'voice' ? { voice_id: agentData.voice } : null,
          created_by: user.id,
          status: 'draft',
        })
        .select()
        .single();

      if (error) throw error;
      router.push(`/start/agents/${data.id}`);
    } catch (error) {
      console.error('Error:', error);
      alert('Error al crear el agente');
    } finally {
      setLoading(false);
    }
  };

  const getStepIcon = (stepId: number) => {
    if (currentStep > stepId) return <Check className="w-4 h-4" />;
    if (currentStep === stepId) return <span className="text-sm font-bold">{stepId}</span>;
    return <span className="text-sm text-gray-500">{stepId}</span>;
  };

  return (
    <div className="min-h-screen bg-[#0f1117]">
      {/* Header */}
      <header className="border-b border-white/5 bg-[#0f1117] sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="font-medium">Volver</span>
            </button>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#0096ff] rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-white">Crear Agente</span>
            </div>
            
            <div className="w-20" />
          </div>
        </div>
      </header>

      {/* Stepper */}
      <div className="border-b border-white/5 bg-[#0f1117]/50">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      currentStep >= step.id
                        ? 'bg-[#0096ff] text-white'
                        : 'bg-[#1a1d26] text-gray-500 border border-white/10'
                    }`}
                  >
                    {getStepIcon(step.id)}
                  </div>
                  <span className={`mt-2 text-xs font-medium ${
                    currentStep >= step.id ? 'text-white' : 'text-gray-500'
                  }`}>
                    {step.name}
                  </span>
                </div>
                
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-4 ${
                    currentStep > step.id ? 'bg-[#0096ff]' : 'bg-white/10'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-[#1a1d26] border border-white/5 rounded-2xl p-8">
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  ¿Qué tipo de agente quieres crear?
                </h3>
                <p className="text-gray-400">
                  Selecciona el tipo que mejor se adapte a tus necesidades
                </p>
              </div>
              
              <div className="space-y-3">
                {agentTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setAgentData({ ...agentData, type: type.id })}
                    className={`w-full p-5 rounded-xl border-2 text-left transition-all relative overflow-hidden ${
                      agentData.type === type.id
                        ? 'border-[#0096ff] bg-[#0096ff]/5'
                        : 'border-white/10 bg-[#0f1117] hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="text-4xl">{type.icon}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="text-lg font-semibold text-white">{type.name}</h4>
                          {type.popular && (
                            <span className="bg-[#a3e635] text-[#0f1117] text-xs px-2 py-0.5 rounded-full font-semibold">
                              Popular
                            </span>
                          )}
                        </div>
                        <p className="text-gray-400 text-sm mb-3">{type.description}</p>
                        <div className="flex flex-wrap gap-2">
                          {type.features.map((feature, idx) => (
                            <span key={idx} className="text-xs bg-white/5 text-gray-300 px-2.5 py-1 rounded-md">
                              {feature}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        agentData.type === type.id
                          ? 'border-[#0096ff] bg-[#0096ff]'
                          : 'border-gray-600'
                      }`}>
                        {agentData.type === type.id && <Check className="w-4 h-4 text-white" />}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  Configura la personalidad
                </h3>
                <p className="text-gray-400">
                  Define cómo se comportará y comunicará tu agente
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Nombre del agente <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={agentData.name}
                    onChange={(e) => setAgentData({ ...agentData, name: e.target.value })}
                    placeholder="Ej: Lía - Calificadora de Leads"
                    className="w-full px-4 py-3 bg-[#0f1117] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-[#0096ff] focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Descripción
                  </label>
                  <textarea
                    value={agentData.description}
                    onChange={(e) => setAgentData({ ...agentData, description: e.target.value })}
                    placeholder="Describe qué hace este agente..."
                    rows={3}
                    className="w-full px-4 py-3 bg-[#0f1117] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-[#0096ff] focus:outline-none resize-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-3">
                    Personalidad
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {personalities.map((personality) => (
                      <button
                        key={personality.id}
                        onClick={() => setAgentData({ ...agentData, personality: personality.id })}
                        className={`p-4 rounded-xl border text-left transition-all ${
                          agentData.personality === personality.id
                            ? 'border-[#0096ff] bg-[#0096ff]/5'
                            : 'border-white/10 bg-[#0f1117] hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl">{personality.emoji}</span>
                          <span className="font-semibold text-white">{personality.name}</span>
                        </div>
                        <p className="text-sm text-gray-400">{personality.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {agentData.type === 'voice' && (
                  <div>
                    <label className="block text-sm font-medium text-white mb-3 flex items-center gap-2">
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
                              ? 'border-[#0096ff] bg-[#0096ff]/5'
                              : 'border-white/10 bg-[#0f1117] hover:border-white/20'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-white text-sm">{voice.name}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              voice.gender === 'male' ? 'bg-blue-500/20 text-blue-400' :
                              voice.gender === 'female' ? 'bg-pink-500/20 text-pink-400' :
                              'bg-gray-500/20 text-gray-400'
                            }`}>
                              {voice.gender === 'neutral' ? 'N' : voice.gender === 'male' ? 'M' : 'F'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">{voice.preview}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  Conocimiento y comportamiento
                </h3>
                <p className="text-gray-400">
                  Define las instrucciones y conocimientos de tu agente
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2 flex items-center gap-2">
                    <Brain className="w-4 h-4 text-[#0096ff]" />
                    Instrucciones del sistema (System Prompt)
                  </label>
                  <p className="text-xs text-gray-500 mb-3">
                    Estas instrucciones definen el comportamiento base. Sé específico sobre su rol, objetivos y restricciones.
                  </p>
                  <textarea
                    value={agentData.systemPrompt}
                    onChange={(e) => setAgentData({ ...agentData, systemPrompt: e.target.value })}
                    placeholder={`Ejemplo:
Eres un asistente virtual especializado en atención al cliente para una empresa inmobiliaria.

Tu objetivo es:
- Responder preguntas sobre propiedades disponibles
- Agendar citas para visitas
- Calificar leads según su presupuesto

Siempre sé amable, profesional y trata de ayudar al cliente.`}
                    rows={12}
                    className="w-full px-4 py-3 bg-[#0f1117] border border-white/10 rounded-xl text-white placeholder-gray-600 focus:border-[#0096ff] focus:outline-none resize-none font-mono text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button className="p-6 rounded-xl border border-dashed border-white/20 bg-[#0f1117] hover:bg-[#13161f] transition-all text-center">
                    <div className="text-3xl mb-3">📄</div>
                    <p className="text-sm font-medium text-white mb-1">Subir documentos</p>
                    <p className="text-xs text-gray-500">PDF, Word, TXT</p>
                  </button>
                  
                  <button className="p-6 rounded-xl border border-dashed border-white/20 bg-[#0f1117] hover:bg-[#13161f] transition-all text-center">
                    <div className="text-3xl mb-3">🌐</div>
                    <p className="text-sm font-medium text-white mb-1">Importar desde web</p>
                    <p className="text-xs text-gray-500">Scrapear sitio web</p>
                  </button>
                </div>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  Integraciones y canales
                </h3>
                <p className="text-gray-400">
                  Selecciona dónde estará disponible tu agente
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { id: 'whatsapp', name: 'WhatsApp Business', icon: '💬', description: 'Responde mensajes de WhatsApp' },
                  { id: 'phone', name: 'Teléfono', icon: '📞', description: 'Número telefónico dedicado' },
                  { id: 'web', name: 'Web Chat', icon: '🌐', description: 'Widget para tu sitio web' },
                  { id: 'api', name: 'API', icon: '⚡', description: 'Integración programática' },
                ].map((integration) => (
                  <button
                    key={integration.id}
                    onClick={() => {
                      const newIntegrations = agentData.integrations.includes(integration.id)
                        ? agentData.integrations.filter(i => i !== integration.id)
                        : [...agentData.integrations, integration.id];
                      setAgentData({ ...agentData, integrations: newIntegrations });
                    }}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      agentData.integrations.includes(integration.id)
                        ? 'border-[#0096ff] bg-[#0096ff]/5'
                        : 'border-white/10 bg-[#0f1117] hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-2xl">{integration.icon}</span>
                      <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                        agentData.integrations.includes(integration.id)
                          ? 'border-[#0096ff] bg-[#0096ff]'
                          : 'border-gray-600'
                      }`}>
                        {agentData.integrations.includes(integration.id) && <Check className="w-3.5 h-3.5 text-white" />}
                      </div>
                    </div>
                    <h5 className="font-medium text-white mb-1">{integration.name}</h5>
                    <p className="text-xs text-gray-400">{integration.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  Revisar y activar
                </h3>
                <p className="text-gray-400">
                  Verifica la configuración antes de activar tu agente
                </p>
              </div>

              <div className="bg-[#0f1117] border border-white/10 rounded-xl p-6 space-y-5">
                <div className="flex items-center gap-4 pb-5 border-b border-white/10">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#0096ff] to-[#0077cc] rounded-2xl flex items-center justify-center text-2xl">
                    {agentData.type === 'voice' ? '📞' : agentData.type === 'text' ? '💬' : '⚡'}
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-white">{agentData.name || 'Sin nombre'}</h4>
                    <p className="text-sm text-gray-400">{agentData.description || 'Sin descripción'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-gray-500 uppercase tracking-wider">Tipo</span>
                    <p className="text-white capitalize mt-1">{agentData.type}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 uppercase tracking-wider">Personalidad</span>
                    <p className="text-white capitalize mt-1">{agentData.personality}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 uppercase tracking-wider">Idioma</span>
                    <p className="text-white uppercase mt-1">{agentData.language}</p>
                  </div>
                  {agentData.type === 'voice' && (
                    <div>
                      <span className="text-xs text-gray-500 uppercase tracking-wider">Voz</span>
                      <p className="text-white capitalize mt-1">{agentData.voice}</p>
                    </div>
                  )}
                </div>

                <div>
                  <span className="text-xs text-gray-500 uppercase tracking-wider">Integraciones</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {agentData.integrations.length > 0 ? (
                      agentData.integrations.map(i => (
                        <span key={i} className="bg-white/5 text-gray-300 px-3 py-1 rounded-full text-sm capitalize">
                          {i}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-500 text-sm">Ninguna integración seleccionada</span>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-xs text-gray-500 uppercase tracking-wider">Instrucciones</span>
                  <div className="mt-2 p-4 bg-white/5 rounded-lg">
                    <p className="text-sm text-gray-300 line-clamp-4 font-mono">
                      {agentData.systemPrompt || 'Sin instrucciones personalizadas'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button className="flex-1 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white font-medium hover:bg-white/10 transition-colors flex items-center justify-center gap-2">
                  <Play className="w-5 h-5" />
                  Probar agente
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 max-w-4xl mx-auto">
          <button
            onClick={handleBack}
            className="px-6 py-3 text-gray-400 hover:text-white font-medium transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Anterior
          </button>
          
          {currentStep < steps.length ? (
            <button
              onClick={handleNext}
              className="px-8 py-3 bg-[#0096ff] hover:bg-[#0077cc] text-white rounded-xl font-medium transition-colors flex items-center gap-2"
            >
              Siguiente
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={loading}
              className="px-8 py-3 bg-[#a3e635] hover:bg-[#b5f54a] text-[#0f1117] rounded-xl font-semibold transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-[#0f1117]/30 border-t-[#0f1117] rounded-full animate-spin" />
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
