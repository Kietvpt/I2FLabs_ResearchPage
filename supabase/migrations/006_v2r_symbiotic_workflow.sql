-- ============================================================================
-- Migration: 006_v2r_symbiotic_workflow.sql
-- Description: Nâng cấp hạ tầng Supabase cho Quy trình Nghiên cứu Cộng sinh
--              Vibe-to-Rigor (V2R-SRP) tại I2FLabs Vietnam:
--              1. Bổ sung 'formal_proof' và 'ablation' vào reports.report_type
--              2. Dual-Track Publishing (vibe_preprint vs verified_tier1) & confidence_score
--              3. Ghép cặp 1-1 Human Researcher <-> Specialist Agent Twin (Centaur Pod)
--              4. Bảng report_critiques cho phản biện cộng đồng Gate 1 & Hội đồng Gate 2
-- Author: I2FLabs Institute of AI & Cognitive Architecture
-- ============================================================================

-- 1. Mở rộng report_type hỗ trợ đầy đủ đa hình RDD (formal_proof, ablation)
DO $$
DECLARE
  v_constraint_name TEXT;
BEGIN
  SELECT tc.constraint_name INTO v_constraint_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
  WHERE tc.table_schema = 'public'
    AND tc.table_name = 'reports'
    AND tc.constraint_type = 'CHECK'
    AND ccu.column_name = 'report_type'
  LIMIT 1;

  IF v_constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.reports DROP CONSTRAINT %I', v_constraint_name);
  END IF;
END $$;

ALTER TABLE public.reports
  ADD CONSTRAINT reports_report_type_check CHECK (
    report_type IN (
      'whitepaper',
      'research',
      'question',
      'hypothesis',
      'empirical_poc',
      'benchmark',
      'specification',
      'trade_off',
      'debate',
      'failure_mode',
      'formal_proof',
      'ablation'
    )
  );

-- 2. Dual-Track Epistemic Publishing & Convergence Confidence Score
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS publication_track TEXT NOT NULL DEFAULT 'verified_tier1'
    CHECK (publication_track IN ('vibe_preprint', 'verified_tier1')),
  ADD COLUMN IF NOT EXISTS confidence_score NUMERIC(4, 3)
    CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1));

CREATE INDEX IF NOT EXISTS idx_reports_publication_track
  ON public.reports (publication_track, status, published_at DESC);

-- 3. Centaur Research Pod: 1-1 Human <-> Personal Specialist Agent Twin Pairing
ALTER TABLE public.research_domain_members
  ADD COLUMN IF NOT EXISTS paired_human_id UUID REFERENCES public.research_domain_members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pod_role TEXT
    CHECK (pod_role IS NULL OR pod_role IN ('explorer', 'formalizer', 'falsifier', 'curator'));

CREATE INDEX IF NOT EXISTS idx_domain_members_paired_human
  ON public.research_domain_members (paired_human_id);

-- 4. Open Lab Critique & Peer Review Feedback (Gate 1 & Gate 2)
CREATE TABLE IF NOT EXISTS public.report_critiques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_type TEXT NOT NULL DEFAULT 'human' CHECK (author_type IN ('human', 'ai_persona', 'external_reader')),
  persona_aid TEXT,
  stance TEXT NOT NULL DEFAULT 'question' CHECK (stance IN ('supports', 'questions', 'refutes', 'reproduces')),
  summary TEXT NOT NULL,
  evidence_url TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'addressed', 'resolved')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_critiques_report
  ON public.report_critiques (report_id, created_at DESC);

DROP TRIGGER IF EXISTS set_report_critiques_updated_at ON public.report_critiques;
CREATE TRIGGER set_report_critiques_updated_at
  BEFORE UPDATE ON public.report_critiques
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.report_critiques ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view critiques of published reports" ON public.report_critiques;
CREATE POLICY "Public can view critiques of published reports"
  ON public.report_critiques FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.reports r
      WHERE r.id = report_id
        AND (r.status = 'published' OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "Authenticated researchers can submit critiques" ON public.report_critiques;
CREATE POLICY "Authenticated researchers can submit critiques"
  ON public.report_critiques FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by IS NULL OR created_by = auth.uid() OR public.is_admin()
  );

DROP POLICY IF EXISTS "Admins and critique authors can update critiques" ON public.report_critiques;
CREATE POLICY "Admins and critique authors can update critiques"
  ON public.report_critiques FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid() OR public.is_admin())
  WITH CHECK (created_by = auth.uid() OR public.is_admin());
