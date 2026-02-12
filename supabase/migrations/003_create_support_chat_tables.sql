-- Support chat: tickets + messages (multi-tenant)

-- Helper: check if current user is admin for a tenant
CREATE OR REPLACE FUNCTION public.is_tenant_admin(tid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members tm
    WHERE tm.auth_user_id = auth.uid()
      AND tm.tenant_id = tid
      AND tm.rol = 'admin'
      AND COALESCE(tm.activo, true) = true
  );
$$;

-- Tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_tenant_updated ON public.support_tickets(tenant_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_by ON public.support_tickets(created_by, created_at DESC);

-- Messages
CREATE TABLE IF NOT EXISTS public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_role text NOT NULL DEFAULT 'user',
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_created ON public.support_messages(ticket_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_support_messages_tenant_created ON public.support_messages(tenant_id, created_at DESC);

-- Trigger: maintain ticket timestamps
CREATE OR REPLACE FUNCTION public.touch_support_ticket_on_message()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.support_tickets
    SET updated_at = now(),
        last_message_at = now()
  WHERE id = NEW.ticket_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_support_ticket_on_message ON public.support_messages;
CREATE TRIGGER trg_touch_support_ticket_on_message
AFTER INSERT ON public.support_messages
FOR EACH ROW
EXECUTE FUNCTION public.touch_support_ticket_on_message();

-- RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Tickets: read own or tenant admin
DROP POLICY IF EXISTS "Support tickets read" ON public.support_tickets;
CREATE POLICY "Support tickets read" ON public.support_tickets
FOR SELECT
USING (
  created_by = auth.uid() OR public.is_tenant_admin(tenant_id)
);

-- Tickets: create own (or admin)
DROP POLICY IF EXISTS "Support tickets create" ON public.support_tickets;
CREATE POLICY "Support tickets create" ON public.support_tickets
FOR INSERT
WITH CHECK (
  created_by = auth.uid() OR public.is_tenant_admin(tenant_id)
);

-- Tickets: update (admin only)
DROP POLICY IF EXISTS "Support tickets update" ON public.support_tickets;
CREATE POLICY "Support tickets update" ON public.support_tickets
FOR UPDATE
USING (public.is_tenant_admin(tenant_id))
WITH CHECK (public.is_tenant_admin(tenant_id));

-- Messages: read if you can read ticket
DROP POLICY IF EXISTS "Support messages read" ON public.support_messages;
CREATE POLICY "Support messages read" ON public.support_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.support_tickets t
    WHERE t.id = ticket_id
      AND (t.created_by = auth.uid() OR public.is_tenant_admin(t.tenant_id))
  )
);

-- Messages: insert if you can read ticket and you're the sender
DROP POLICY IF EXISTS "Support messages create" ON public.support_messages;
CREATE POLICY "Support messages create" ON public.support_messages
FOR INSERT
WITH CHECK (
  sender_user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.support_tickets t
    WHERE t.id = ticket_id
      AND (t.created_by = auth.uid() OR public.is_tenant_admin(t.tenant_id))
  )
);

COMMENT ON TABLE public.support_tickets IS 'Support chat tickets (multi-tenant)';
COMMENT ON TABLE public.support_messages IS 'Support chat messages per ticket';
