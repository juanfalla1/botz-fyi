-- Migration: Create AI Agents system for Botz Platform
-- This enables voice agents, text agents, and flow creation like Dapta.ai

-- Table for AI Agents (Voice and Text)
CREATE TABLE IF NOT EXISTS ai_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  
  -- Basic Info
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('voice', 'text', 'flow')),
  description TEXT,
  avatar_url TEXT,
  
  -- Configuration
  configuration JSONB NOT NULL DEFAULT '{}',
  -- voice agents: {voice_id, language, greeting, personality, etc.}
  -- text agents: {model, system_prompt, temperature, etc.}
  -- flow agents: {nodes, edges, triggers, etc.}
  
  -- AI Provider Settings
  ai_provider VARCHAR(50) DEFAULT 'openai',
  ai_model VARCHAR(100) DEFAULT 'gpt-4',
  
  -- Voice Settings (for voice agents)
  voice_settings JSONB DEFAULT NULL,
  -- {voice_id, speed, language, accent}
  
  -- Integration Settings
  integrations JSONB DEFAULT '[]',
  -- [{type: 'whatsapp', enabled: true}, {type: 'phone', enabled: false}]
  
  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
  is_public BOOLEAN DEFAULT false,
  
  -- Usage & Credits
  credits_used INTEGER DEFAULT 0,
  credits_limit INTEGER DEFAULT 1000,
  total_conversations INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  
  -- Template Info
  is_template BOOLEAN DEFAULT false,
  template_category VARCHAR(100),
  template_tags TEXT[],
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for Agent Conversations
CREATE TABLE IF NOT EXISTS agent_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Contact Info
  contact_id UUID,
  contact_name VARCHAR(255),
  contact_phone VARCHAR(50),
  contact_email VARCHAR(255),
  
  -- Conversation Data
  channel VARCHAR(50) NOT NULL CHECK (channel IN ('voice', 'whatsapp', 'web', 'api')),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed')),
  
  -- Metrics
  message_count INTEGER DEFAULT 0,
  duration_seconds INTEGER DEFAULT 0,
  credits_used INTEGER DEFAULT 0,
  
  -- Content
  transcript JSONB DEFAULT '[]',
  -- [{role: 'user'|'assistant', content: '...', timestamp: '...'}]
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  -- {lead_id, source, campaign_id, etc.}
  
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for Agent Templates (Pre-configured agents like Lía, Alex, Julia)
CREATE TABLE IF NOT EXISTS agent_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('voice', 'text', 'flow')),
  category VARCHAR(100) NOT NULL,
  description TEXT,
  
  -- Template Configuration
  configuration JSONB NOT NULL,
  voice_settings JSONB DEFAULT NULL,
  avatar_url TEXT,
  
  -- Tags for filtering
  tags TEXT[],
  industry VARCHAR(100),
  use_case VARCHAR(255),
  
  -- Usage Stats
  usage_count INTEGER DEFAULT 0,
  rating_average DECIMAL(3,2) DEFAULT 0.00,
  rating_count INTEGER DEFAULT 0,
  
  created_by UUID REFERENCES auth.users(id),
  is_system BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for Agent Flows (Node-based workflows)
CREATE TABLE IF NOT EXISTS agent_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Flow Definition
  nodes JSONB NOT NULL DEFAULT '[]',
  -- [{id, type, position, data}]
  
  edges JSONB NOT NULL DEFAULT '[]',
  -- [{id, source, target, type}]
  
  -- Triggers
  triggers JSONB DEFAULT '[]',
  -- [{type: 'webhook'|'schedule'|'event', config: {}}]
  
  variables JSONB DEFAULT '{}',
  -- {custom_variables}
  
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for Agent Credits/Usage Tracking
CREATE TABLE IF NOT EXISTS agent_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  
  credit_type VARCHAR(50) NOT NULL CHECK (credit_type IN ('conversation', 'message', 'minute', 'token')),
  credits_used INTEGER DEFAULT 0,
  credits_limit INTEGER DEFAULT 0,
  credits_remaining INTEGER DEFAULT 0,
  
  period_start DATE,
  period_end DATE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_ai_agents_tenant_id ON ai_agents(tenant_id);
CREATE INDEX idx_ai_agents_type ON ai_agents(type);
CREATE INDEX idx_ai_agents_status ON ai_agents(status);
CREATE INDEX idx_ai_agents_is_template ON ai_agents(is_template);

CREATE INDEX idx_agent_conversations_agent_id ON agent_conversations(agent_id);
CREATE INDEX idx_agent_conversations_tenant_id ON agent_conversations(tenant_id);
CREATE INDEX idx_agent_conversations_status ON agent_conversations(status);
CREATE INDEX idx_agent_conversations_created_at ON agent_conversations(created_at);

CREATE INDEX idx_agent_templates_type ON agent_templates(type);
CREATE INDEX idx_agent_templates_category ON agent_templates(category);
CREATE INDEX idx_agent_templates_tags ON agent_templates USING GIN(tags);

CREATE INDEX idx_agent_flows_agent_id ON agent_flows(agent_id);

CREATE INDEX idx_agent_credits_tenant_id ON agent_credits(tenant_id);

-- Enable RLS
ALTER TABLE ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_credits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_agents
CREATE POLICY "Users can view agents in their tenant" ON ai_agents
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM team_members WHERE auth_user_id = auth.uid()
    ) OR
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM platform_admins WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Users can create agents in their tenant" ON ai_agents
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM team_members WHERE auth_user_id = auth.uid()
    ) OR
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM platform_admins WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Users can update their agents" ON ai_agents
  FOR UPDATE USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM platform_admins WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Users can delete their agents" ON ai_agents
  FOR DELETE USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM platform_admins WHERE auth_user_id = auth.uid())
  );

-- RLS Policies for agent_conversations
CREATE POLICY "Users can view conversations in their tenant" ON agent_conversations
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM team_members WHERE auth_user_id = auth.uid()
    ) OR
    EXISTS (SELECT 1 FROM platform_admins WHERE auth_user_id = auth.uid())
  );

-- System templates are public
CREATE POLICY "System templates are viewable by all" ON agent_templates
  FOR SELECT USING (is_system = true OR is_active = true);

-- Comments
COMMENT ON TABLE ai_agents IS 'AI Agents for voice, text, and flow automation';
COMMENT ON TABLE agent_conversations IS 'Individual conversations with AI agents';
COMMENT ON TABLE agent_templates IS 'Pre-configured agent templates (like Lía, Alex, Julia)';
COMMENT ON TABLE agent_flows IS 'Node-based workflows for agents';
COMMENT ON TABLE agent_credits IS 'Usage tracking and credit management for agents';
