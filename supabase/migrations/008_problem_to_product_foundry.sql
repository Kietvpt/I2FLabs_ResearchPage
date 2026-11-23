-- ============================================================================
-- Migration: 008_problem_to_product_foundry.sql
-- Description: Problem-to-Product Foundry (Vibe-to-Unikorn Habit Flywheel):
--              1. research_ventures: Thực thể hợp nhất Bài toán <-> Cây RDD <-> MVP <-> Unikorn
--              2. problem_skills: Đồ thị Kỹ năng đúc kết xoay quanh từng bài toán & nạp vào AI Twin
--              3. venture_telemetry_events: Tín hiệu thực tế từ MVP/Unikorn quay về sinh Return Spark
--              4. rd_habit_logs: Nhật ký thói quen R&D đàn hồi (15p/ngày, streak, distill)
-- Author: I2FLabs Institute of AI & Cognitive Architecture
-- ============================================================================

-- 0. Mở rộng task_type trong research_tasks để hỗ trợ return_spark & skill_bounty
DO $$
DECLARE
  v_constraint_name TEXT;
BEGIN
  IF to_regclass('public.research_tasks') IS NOT NULL THEN
    SELECT tc.constraint_name INTO v_constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'research_tasks'
      AND tc.constraint_type = 'CHECK'
      AND ccu.column_name = 'task_type'
    LIMIT 1;

    IF v_constraint_name IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.research_tasks DROP CONSTRAINT %I', v_constraint_name);
    END IF;

    ALTER TABLE public.research_tasks
      ADD CONSTRAINT research_tasks_task_type_check CHECK (
        task_type IN (
          'vibe_spark',
          'formal_proof',
          'empirical_poc',
          'benchmark',
          'fmea_audit',
          'publication',
          'return_spark',
          'skill_bounty'
        )
      );
  END IF;
END $$;

-- 1. Research Ventures (Problem <-> RDD <-> Prototype/MVP <-> Unikorn <-> Loop)
CREATE TABLE IF NOT EXISTS public.research_ventures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID REFERENCES public.research_domains(id) ON DELETE SET NULL,
  topic_id UUID REFERENCES public.research_topics(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  problem_statement TEXT NOT NULL,
  target_user TEXT,
  stage TEXT NOT NULL DEFAULT 'vibe_spark'
    CHECK (stage IN ('vibe_spark', 'deep_rdd', 'prototype_mvp', 'unikorn_live', 'research_loop')),
  cycle_number INT NOT NULL DEFAULT 1 CHECK (cycle_number >= 1),
  lead_human_name TEXT NOT NULL,
  lead_ai_name TEXT NOT NULL DEFAULT 'An',
  mvp_url TEXT,
  repo_url TEXT,
  readiness_score INT NOT NULL DEFAULT 20 CHECK (readiness_score >= 0 AND readiness_score <= 100),
  upvotes_count INT NOT NULL DEFAULT 0 CHECK (upvotes_count >= 0),
  unikorn_metrics JSONB NOT NULL DEFAULT '{"active_users": 0, "retention_7d": 0, "p95_latency_ms": 0, "verified_accuracy": 0}'::jsonb,
  rdd_nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.research_ventures
  ADD COLUMN IF NOT EXISTS upvotes_count INT NOT NULL DEFAULT 0 CHECK (upvotes_count >= 0);

CREATE INDEX IF NOT EXISTS idx_research_ventures_stage ON public.research_ventures(domain_id, stage);

DROP TRIGGER IF EXISTS set_research_ventures_updated_at ON public.research_ventures;
CREATE TRIGGER set_research_ventures_updated_at
  BEFORE UPDATE ON public.research_ventures
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.research_ventures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated researchers can view ventures" ON public.research_ventures;
CREATE POLICY "Authenticated researchers can view ventures"
  ON public.research_ventures FOR SELECT
  TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "Authenticated researchers can manage ventures" ON public.research_ventures;
CREATE POLICY "Authenticated researchers can manage ventures"
  ON public.research_ventures FOR ALL
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

-- 2. Problem Skills (Đồ thị Kỹ năng xoay quanh từng Bài toán & Nạp vào Personal AI)
CREATE TABLE IF NOT EXISTS public.problem_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venture_id UUID NOT NULL REFERENCES public.research_ventures(id) ON DELETE CASCADE,
  domain_id UUID REFERENCES public.research_domains(id) ON DELETE SET NULL,
  skill_key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  competency_axis TEXT NOT NULL DEFAULT 'systems'
    CHECK (competency_axis IN ('algorithm', 'systems', 'product_ux', 'fmea_safety', 'unikorn_growth')),
  maturity_level TEXT NOT NULL DEFAULT 'gap'
    CHECK (maturity_level IN ('gap', 'learning', 'verified', 'automated_in_ai')),
  first_principles TEXT,
  procedure TEXT,
  verification_criteria TEXT,
  evidence_url TEXT,
  aevum_skill_id TEXT,
  owner_human_name TEXT,
  injected_ai_agent_id UUID REFERENCES public.researcher_ai_agents(id) ON DELETE SET NULL,
  injected_ai_name TEXT,
  reuse_count INT NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_problem_skills_venture ON public.problem_skills(venture_id, maturity_level);

DROP TRIGGER IF EXISTS set_problem_skills_updated_at ON public.problem_skills;
CREATE TRIGGER set_problem_skills_updated_at
  BEFORE UPDATE ON public.problem_skills
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.problem_skills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated researchers can view problem skills" ON public.problem_skills;
CREATE POLICY "Authenticated researchers can view problem skills"
  ON public.problem_skills FOR SELECT
  TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "Authenticated researchers can manage problem skills" ON public.problem_skills;
CREATE POLICY "Authenticated researchers can manage problem skills"
  ON public.problem_skills FOR ALL
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

-- 3. Venture Telemetry Events (Unikorn -> Return Research Spark Loop)
CREATE TABLE IF NOT EXISTS public.venture_telemetry_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venture_id UUID NOT NULL REFERENCES public.research_ventures(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL DEFAULT 'friction'
    CHECK (event_type IN ('friction', 'crash', 'benchmark_drift', 'feature_pull')),
  severity TEXT NOT NULL DEFAULT 'medium'
    CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  detail TEXT,
  metric_delta TEXT,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'converted_to_spark', 'resolved')),
  converted_task_id UUID REFERENCES public.research_tasks(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_venture_telemetry_venture ON public.venture_telemetry_events(venture_id, status);

ALTER TABLE public.venture_telemetry_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated researchers can read telemetry" ON public.venture_telemetry_events;
CREATE POLICY "Authenticated researchers can read telemetry"
  ON public.venture_telemetry_events FOR SELECT
  TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "Authenticated researchers can manage telemetry" ON public.venture_telemetry_events;
CREATE POLICY "Authenticated researchers can manage telemetry"
  ON public.venture_telemetry_events FOR ALL
  TO authenticated
  USING (created_by = auth.uid() OR public.is_admin())
  WITH CHECK (created_by = auth.uid() OR public.is_admin());

-- 4. R&D Habit Logs (Micro-Cadence & Elastic Research Streak)
CREATE TABLE IF NOT EXISTS public.rd_habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venture_id UUID REFERENCES public.research_ventures(id) ON DELETE CASCADE,
  actor_name TEXT NOT NULL,
  actor_type TEXT NOT NULL DEFAULT 'human' CHECK (actor_type IN ('human', 'ai_agent')),
  ritual_type TEXT NOT NULL DEFAULT 'spark_logged'
    CHECK (ritual_type IN ('spark_logged', 'rdd_branched', 'poc_shipped', 'skill_distilled', 'telemetry_triaged')),
  note TEXT NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 15,
  logged_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rd_habit_logs_venture_date ON public.rd_habit_logs(venture_id, logged_date DESC);

ALTER TABLE public.rd_habit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated researchers can read habit logs" ON public.rd_habit_logs;
CREATE POLICY "Authenticated researchers can read habit logs"
  ON public.rd_habit_logs FOR SELECT
  TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "Authenticated researchers can post habit logs" ON public.rd_habit_logs;
CREATE POLICY "Authenticated researchers can post habit logs"
  ON public.rd_habit_logs FOR INSERT
  TO authenticated
  WITH CHECK (created_by IS NULL OR created_by = auth.uid() OR public.is_admin());
