// Agent Studio Components
export { default as AgentStudio } from './page';
export { default as CreateAgent } from './create/page';
// export { default as AgentDetail } from './[id]/page';

// Types
export interface Agent {
  id: string;
  name: string;
  type: 'voice' | 'text' | 'flow';
  status: 'draft' | 'active' | 'paused' | 'archived';
  description?: string;
  avatar_url?: string;
  configuration: {
    personality?: string;
    language?: string;
    system_prompt?: string;
  };
  voice_settings?: {
    voice_id?: string;
  };
  integrations?: string[];
  credits_used?: number;
  credits_limit?: number;
  total_conversations?: number;
  total_messages?: number;
  is_template?: boolean;
  created_at: string;
  updated_at: string;
}

export interface AgentTemplate {
  id: string;
  name: string;
  type: 'voice' | 'text' | 'flow';
  category: string;
  description: string;
  configuration: Record<string, any>;
  voice_settings?: Record<string, any>;
  avatar_url?: string;
  tags: string[];
  usage_count: number;
  is_system: boolean;
}

export interface AgentConversation {
  id: string;
  agent_id: string;
  contact_name?: string;
  contact_phone?: string;
  channel: 'voice' | 'whatsapp' | 'web' | 'api';
  status: 'active' | 'completed' | 'failed';
  message_count: number;
  duration_seconds?: number;
  transcript: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>;
  started_at: string;
  ended_at?: string;
}
