-- ============================================================================
-- Migration: 007_workspace_ai_human_dashboard.sql
-- Description: Bảng quản trị Research Workspace AI & Human cho I2FLabs Vietnam:
--              1. researcher_ai_agents: Đội tác tử AI chuyên môn riêng của từng Researcher (1-N)
--              2. research_topics: Đề tài nghiên cứu & tiến độ cây RDD (Mode A/B/C)
--              3. research_tasks: Kanban nhiệm vụ & Open Research Bounties
--              4. workspace_messages: Chat nhóm Human <-> Human <-> AI Twin theo ngữ cảnh
-- Author: I2FLabs Institute of AI & Cognitive Architecture
-- ============================================================================

-- 1. Personal AI Researcher Fleet (1 Human Researcher <-> 1..N Personal AI Researchers)
CREATE TABLE IF NOT EXISTS public.researcher_ai_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID REFERENCES public.research_domains(id) ON DELETE SET NULL,
  owner_member_id UUID REFERENCES public.research_domain_members(id) ON DELETE SET NULL,
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  owner_name TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  persona_aid TEXT NOT NULL,
  pod_role TEXT NOT NULL DEFAULT 'explorer'
    CHECK (pod_role IN ('explorer', 'formalizer', 'falsifier', 'curator')),
  ai_scope TEXT NOT NULL DEFAULT 'pod_shared'
    CHECK (ai_scope IN ('private_twin', 'pod_shared', 'council_reviewer')),
  specialty_focus TEXT,
  model_name TEXT NOT NULL DEFAULT 'Gemini 3.8 Flash High',
  custom_instructions TEXT,
  mcp_key_id UUID,
  status TEXT NOT NULL DEFAULT 'online'
    CHECK (status IN ('online', 'researching', 'idle', 'archived')),
  reports_contributed INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF to_regclass('public.mcp_api_keys') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'researcher_ai_agents_mcp_key_id_fkey'
         AND conrelid = 'public.researcher_ai_agents'::regclass
     ) THEN
    ALTER TABLE public.researcher_ai_agents
      ADD CONSTRAINT researcher_ai_agents_mcp_key_id_fkey
      FOREIGN KEY (mcp_key_id)
      REFERENCES public.mcp_api_keys(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ai_agents_owner_user ON public.researcher_ai_agents(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_ai_agents_owner_member ON public.researcher_ai_agents(owner_member_id);
CREATE INDEX IF NOT EXISTS idx_ai_agents_domain ON public.researcher_ai_agents(domain_id);

DROP TRIGGER IF EXISTS set_researcher_ai_agents_updated_at ON public.researcher_ai_agents;
CREATE TRIGGER set_researcher_ai_agents_updated_at
  BEFORE UPDATE ON public.researcher_ai_agents
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.researcher_ai_agents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Researchers can view shared or own AI agents" ON public.researcher_ai_agents;
CREATE POLICY "Researchers can view shared or own AI agents"
  ON public.researcher_ai_agents FOR SELECT
  TO authenticated
  USING (
    ai_scope IN ('pod_shared', 'council_reviewer')
    OR owner_user_id = auth.uid()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Researchers can manage own AI agents" ON public.researcher_ai_agents;
CREATE POLICY "Researchers can manage own AI agents"
  ON public.researcher_ai_agents FOR ALL
  TO authenticated
  USING (owner_user_id = auth.uid() OR public.is_admin())
  WITH CHECK (owner_user_id = auth.uid() OR public.is_admin());

-- 2. Research Topics & RDD Progress Tracking
CREATE TABLE IF NOT EXISTS public.research_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID REFERENCES public.research_domains(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  summary TEXT,
  sphere_id TEXT,
  lead_name TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'mode_a_vibe'
    CHECK (mode IN ('mode_a_vibe', 'mode_b_pod', 'mode_c_council')),
  status TEXT NOT NULL DEFAULT 'exploring'
    CHECK (status IN ('exploring', 'in_progress', 'gate2_review', 'published', 'archived')),
  progress_percent INT NOT NULL DEFAULT 15 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  confidence_score NUMERIC(4, 3) CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1)),
  target_node_types TEXT[] NOT NULL DEFAULT ARRAY['question', 'hypothesis', 'specification', 'empirical_poc', 'benchmark', 'failure_mode'],
  completed_node_types TEXT[] NOT NULL DEFAULT '{}'::text[],
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_research_topics_domain ON public.research_topics(domain_id, status);

DROP TRIGGER IF EXISTS set_research_topics_updated_at ON public.research_topics;
CREATE TRIGGER set_research_topics_updated_at
  BEFORE UPDATE ON public.research_topics
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.research_topics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated researchers can view topics" ON public.research_topics;
CREATE POLICY "Authenticated researchers can view topics"
  ON public.research_topics FOR SELECT
  TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "Admins and domain members can manage topics" ON public.research_topics;
CREATE POLICY "Admins and domain members can manage topics"
  ON public.research_topics FOR ALL
  TO authenticated
  USING (
    created_by = auth.uid()
    OR (domain_id IS NOT NULL AND public.is_research_domain_member(domain_id))
    OR public.is_admin()
  )
  WITH CHECK (
    created_by = auth.uid()
    OR (domain_id IS NOT NULL AND public.is_research_domain_member(domain_id))
    OR public.is_admin()
  );

-- 3. Research Tasks & Open Research Bounties
CREATE TABLE IF NOT EXISTS public.research_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID REFERENCES public.research_domains(id) ON DELETE SET NULL,
  topic_id UUID REFERENCES public.research_topics(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL DEFAULT 'vibe_spark'
    CHECK (task_type IN ('vibe_spark', 'formal_proof', 'empirical_poc', 'benchmark', 'fmea_audit', 'publication')),
  status TEXT NOT NULL DEFAULT 'backlog'
    CHECK (status IN ('backlog', 'in_progress', 'gate2_review', 'done')),
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assignee_human_name TEXT,
  assignee_ai_name TEXT,
  assignee_ai_id UUID REFERENCES public.researcher_ai_agents(id) ON DELETE SET NULL,
  is_bounty BOOLEAN NOT NULL DEFAULT FALSE,
  due_date DATE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_research_tasks_domain_status ON public.research_tasks(domain_id, status);
CREATE INDEX IF NOT EXISTS idx_research_tasks_topic ON public.research_tasks(topic_id);

DROP TRIGGER IF EXISTS set_research_tasks_updated_at ON public.research_tasks;
CREATE TRIGGER set_research_tasks_updated_at
  BEFORE UPDATE ON public.research_tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.research_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated researchers can view tasks" ON public.research_tasks;
CREATE POLICY "Authenticated researchers can view tasks"
  ON public.research_tasks FOR SELECT
  TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "Authenticated researchers can manage tasks" ON public.research_tasks;
CREATE POLICY "Authenticated researchers can manage tasks"
  ON public.research_tasks FOR ALL
  TO authenticated
  USING (
    created_by = auth.uid()
    OR (domain_id IS NOT NULL AND public.is_research_domain_member(domain_id))
    OR public.is_admin()
  )
  WITH CHECK (
    created_by = auth.uid()
    OR (domain_id IS NOT NULL AND public.is_research_domain_member(domain_id))
    OR public.is_admin()
  );

-- 4. Workspace Symbiotic Chat Messages (Human <-> Human <-> AI Agents)
CREATE TABLE IF NOT EXISTS public.workspace_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID REFERENCES public.research_domains(id) ON DELETE SET NULL,
  topic_id UUID REFERENCES public.research_topics(id) ON DELETE SET NULL,
  channel TEXT NOT NULL DEFAULT 'pod' CHECK (channel IN ('pod', 'council', 'direct')),
  sender_type TEXT NOT NULL DEFAULT 'human' CHECK (sender_type IN ('human', 'ai_agent', 'system')),
  sender_name TEXT NOT NULL,
  sender_aid TEXT,
  target_agent_name TEXT,
  content TEXT NOT NULL,
  linked_task_id UUID REFERENCES public.research_tasks(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workspace_messages_channel ON public.workspace_messages(domain_id, channel, created_at DESC);

ALTER TABLE public.workspace_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated researchers can read workspace chat" ON public.workspace_messages;
CREATE POLICY "Authenticated researchers can read workspace chat"
  ON public.workspace_messages FOR SELECT
  TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "Authenticated researchers can post workspace chat" ON public.workspace_messages;
CREATE POLICY "Authenticated researchers can post workspace chat"
  ON public.workspace_messages FOR INSERT
  TO authenticated
  WITH CHECK (created_by IS NULL OR created_by = auth.uid() OR public.is_admin());
