-- ============================================================================
-- Migration: 009_server_evaluation_and_contributions.sql
-- Description: Hệ thống Thẩm định & Chấm điểm Ý tưởng trên Server + Theo dõi
--              Tham gia & Tính điểm Đóng góp R&D -> Sản phẩm -> Thị trường
-- Author: I2FLabs Institute of AI & Cognitive Architecture
-- ============================================================================

-- 1. Mở rộng bảng research_ventures để lưu kết quả thẩm định tổng hợp từ Server
ALTER TABLE public.research_ventures
  ADD COLUMN IF NOT EXISTS evaluation_status TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (evaluation_status IN ('pending_review', 'approved_for_dev', 'revision_needed')),
  ADD COLUMN IF NOT EXISTS evaluation_score NUMERIC(5, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS human_approvals INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_approvals INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS market_value_note TEXT;

-- 2. Bảng Thẩm định & Chấm điểm Ý tưởng (Cả Human Thành viên & AI Agent trên Server)
CREATE TABLE IF NOT EXISTS public.venture_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venture_id UUID NOT NULL REFERENCES public.research_ventures(id) ON DELETE CASCADE,
  evaluator_type TEXT NOT NULL CHECK (evaluator_type IN ('human', 'ai_agent')),
  evaluator_name TEXT NOT NULL,
  ai_agent_id UUID REFERENCES public.researcher_ai_agents(id) ON DELETE SET NULL,
  verdict TEXT NOT NULL DEFAULT 'approve'
    CHECK (verdict IN ('approve', 'needs_revision', 'reject')),
  market_pain_score INT NOT NULL CHECK (market_pain_score BETWEEN 0 AND 100),
  feasibility_score INT NOT NULL CHECK (feasibility_score BETWEEN 0 AND 100),
  product_viability_score INT NOT NULL CHECK (product_viability_score BETWEEN 0 AND 100),
  novelty_score INT NOT NULL CHECK (novelty_score BETWEEN 0 AND 100),
  overall_score NUMERIC(5, 2) GENERATED ALWAYS AS (
    ROUND((market_pain_score * 0.30 + feasibility_score * 0.25 + product_viability_score * 0.30 + novelty_score * 0.15)::numeric, 2)
  ) STORED,
  review_note TEXT NOT NULL,
  ai_coaching_plan JSONB,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_venture_evaluations_venture ON public.venture_evaluations(venture_id, created_at DESC);

ALTER TABLE public.venture_evaluations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view venture evaluations" ON public.venture_evaluations;
CREATE POLICY "Authenticated users can view venture evaluations"
  ON public.venture_evaluations FOR SELECT
  TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "Authenticated users can submit venture evaluations" ON public.venture_evaluations;
CREATE POLICY "Authenticated users can submit venture evaluations"
  ON public.venture_evaluations FOR INSERT
  TO authenticated
  WITH CHECK (created_by IS NULL OR created_by = auth.uid() OR public.is_admin());

-- 3. Trigger Server tự động tổng hợp điểm & mở khóa Gate phát triển sản phẩm
-- Quy tắc Gate trên Server: Cần điểm TB >= 70 VÀ >= 1 Human duyệt + >= 1 AI duyệt
CREATE OR REPLACE FUNCTION public.fn_sync_venture_evaluation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_venture_id UUID;
  v_avg_score NUMERIC(5, 2);
  v_human_ok INT;
  v_ai_ok INT;
  v_needs_rev INT;
  v_next_status TEXT;
BEGIN
  v_venture_id := COALESCE(NEW.venture_id, OLD.venture_id);

  SELECT
    COALESCE(ROUND(AVG(overall_score)::numeric, 2), 0),
    COUNT(*) FILTER (WHERE evaluator_type = 'human' AND verdict = 'approve'),
    COUNT(*) FILTER (WHERE evaluator_type = 'ai_agent' AND verdict = 'approve'),
    COUNT(*) FILTER (WHERE verdict IN ('needs_revision', 'reject'))
  INTO v_avg_score, v_human_ok, v_ai_ok, v_needs_rev
  FROM public.venture_evaluations
  WHERE venture_id = v_venture_id;

  IF v_avg_score >= 70 AND v_human_ok >= 1 AND v_ai_ok >= 1 THEN
    v_next_status := 'approved_for_dev';
  ELSIF v_needs_rev > 0 AND (v_human_ok = 0 OR v_ai_ok = 0 OR v_avg_score < 70) THEN
    v_next_status := 'revision_needed';
  ELSE
    v_next_status := 'pending_review';
  END IF;

  UPDATE public.research_ventures
  SET
    evaluation_score = v_avg_score,
    human_approvals = v_human_ok,
    ai_approvals = v_ai_ok,
    evaluation_status = v_next_status,
    updated_at = NOW()
  WHERE id = v_venture_id;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_venture_evaluation ON public.venture_evaluations;
CREATE TRIGGER trg_sync_venture_evaluation
  AFTER INSERT OR UPDATE OR DELETE ON public.venture_evaluations
  FOR EACH ROW EXECUTE FUNCTION public.fn_sync_venture_evaluation();

-- 4. Bảng Thành viên tham gia vào bất kỳ ý tưởng/dự án nào
CREATE TABLE IF NOT EXISTS public.venture_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venture_id UUID NOT NULL REFERENCES public.research_ventures(id) ON DELETE CASCADE,
  participant_name TEXT NOT NULL,
  participant_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  role_in_venture TEXT NOT NULL DEFAULT 'co_researcher'
    CHECK (role_in_venture IN ('owner', 'co_researcher', 'builder', 'reviewer', 'market_lead')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (venture_id, participant_name)
);

CREATE INDEX IF NOT EXISTS idx_venture_participants_venture ON public.venture_participants(venture_id);

ALTER TABLE public.venture_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view participants" ON public.venture_participants;
CREATE POLICY "Authenticated users can view participants"
  ON public.venture_participants FOR SELECT
  TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "Authenticated users can join ventures" ON public.venture_participants;
CREATE POLICY "Authenticated users can join ventures"
  ON public.venture_participants FOR INSERT
  TO authenticated
  WITH CHECK (participant_user_id IS NULL OR participant_user_id = auth.uid() OR public.is_admin());

-- 5. Sổ cái Tính điểm Đóng góp theo từng giai đoạn R&D -> Sản phẩm -> Thị trường
CREATE TABLE IF NOT EXISTS public.contribution_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venture_id UUID NOT NULL REFERENCES public.research_ventures(id) ON DELETE CASCADE,
  contributor_name TEXT NOT NULL,
  contributor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  stage_earned TEXT NOT NULL
    CHECK (stage_earned IN ('idea_review', 'deep_research', 'skill_distill', 'mvp_build', 'unikorn_market', 'return_loop')),
  points INT NOT NULL CHECK (points > 0),
  evidence_title TEXT NOT NULL,
  verified_by TEXT NOT NULL DEFAULT 'Server Rule Engine',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contribution_ledger_venture ON public.contribution_ledger(venture_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contribution_ledger_contributor ON public.contribution_ledger(contributor_name);

ALTER TABLE public.contribution_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view contribution ledger" ON public.contribution_ledger;
CREATE POLICY "Authenticated users can view contribution ledger"
  ON public.contribution_ledger FOR SELECT
  TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "Authenticated users can record verified contributions" ON public.contribution_ledger;
CREATE POLICY "Authenticated users can record verified contributions"
  ON public.contribution_ledger FOR INSERT
  TO authenticated
  WITH CHECK (contributor_user_id IS NULL OR contributor_user_id = auth.uid() OR public.is_admin());

-- 6. Server RPC: AI Server tự động thẩm định, chấm điểm 4 tiêu chí & lập lộ trình Nghiên cứu -> Thị trường
CREATE OR REPLACE FUNCTION public.run_server_ai_evaluation(
  p_venture_id UUID,
  p_agent_id UUID DEFAULT NULL
)
RETURNS public.venture_evaluations
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_venture public.research_ventures%ROWTYPE;
  v_agent_name TEXT := 'Server AI Reviewer';
  v_resolved_agent_id UUID := p_agent_id;
  v_skills_count INT := 0;
  v_rdd_count INT := 0;
  v_market_score INT;
  v_feasibility_score INT;
  v_product_score INT;
  v_novelty_score INT;
  v_avg NUMERIC(5, 2);
  v_verdict TEXT;
  v_note TEXT;
  v_plan JSONB;
  v_inserted public.venture_evaluations%ROWTYPE;
BEGIN
  SELECT * INTO v_venture FROM public.research_ventures WHERE id = p_venture_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy ý tưởng/dự án (%) để thẩm định.', p_venture_id;
  END IF;

  IF p_agent_id IS NOT NULL THEN
    SELECT agent_name INTO v_agent_name FROM public.researcher_ai_agents WHERE id = p_agent_id;
    v_agent_name := COALESCE(v_agent_name, 'Server AI Reviewer');
  ELSE
    SELECT id, agent_name INTO v_resolved_agent_id, v_agent_name
    FROM public.researcher_ai_agents
    WHERE status <> 'archived'
    ORDER BY created_at ASC
    LIMIT 1;
    v_agent_name := COALESCE(v_agent_name, 'Server AI Reviewer');
  END IF;

  SELECT COUNT(*) INTO v_skills_count FROM public.problem_skills WHERE venture_id = p_venture_id;
  v_rdd_count := COALESCE(jsonb_array_length(v_venture.rdd_nodes), 0);

  -- Rubric chấm điểm xác định trên Server từ dữ liệu thật của bài toán
  v_market_score := LEAST(96, 52
    + CASE WHEN length(COALESCE(v_venture.problem_statement, '')) >= 45 THEN 22 ELSE 8 END
    + CASE WHEN length(COALESCE(v_venture.target_user, '')) >= 5 THEN 16 ELSE 0 END);

  v_feasibility_score := LEAST(96, 55
    + LEAST(20, v_rdd_count * 5)
    + CASE WHEN v_venture.repo_url IS NOT NULL OR v_venture.mvp_url IS NOT NULL THEN 15 ELSE 5 END);

  v_product_score := LEAST(95, 50
    + CASE WHEN length(COALESCE(v_venture.target_user, '')) >= 5 THEN 15 ELSE 0 END
    + CASE WHEN v_skills_count >= 1 THEN 15 ELSE 5 END
    + CASE WHEN v_venture.mvp_url IS NOT NULL THEN 15 ELSE 5 END);

  v_novelty_score := LEAST(95, 62
    + CASE WHEN length(COALESCE(v_venture.title, '')) >= 12 THEN 15 ELSE 6 END
    + CASE WHEN length(COALESCE(v_venture.problem_statement, '')) >= 80 THEN 12 ELSE 4 END);

  v_avg := ROUND((v_market_score * 0.30 + v_feasibility_score * 0.25 + v_product_score * 0.30 + v_novelty_score * 0.15)::numeric, 2);

  IF v_avg >= 70 THEN
    v_verdict := 'approve';
    v_note := format(
      'Server AI (%s) đạt chuẩn %s/100: Bài toán rõ nỗi đau thị trường, có hướng chuyển hóa thành sản phẩm MVP. Đủ điều kiện mở khóa chu trình R&D -> Sản phẩm.',
      v_agent_name, v_avg
    );
  ELSE
    v_verdict := 'needs_revision';
    v_note := format(
      'Server AI (%s) chấm %s/100: Cần làm rõ hơn đối tượng người dùng trả tiền/sử dụng (target_user) và mô tả cụ thể nỗi đau trước khi dựng MVP.',
      v_agent_name, v_avg
    );
  END IF;

  v_plan := jsonb_build_object(
    'market_validation', format('Xác thực nỗi đau với 3-5 người dùng thuộc nhóm: %s trước khi code sâu.', COALESCE(v_venture.target_user, 'Chưa định danh rõ ICP')),
    'research_focus', format('Hoàn tất %s nhánh kiểm chứng khoa học (đặc biệt Thực nghiệm PoC & Chốt an toàn) cho bài toán "%s".', GREATEST(v_rdd_count, 3), v_venture.title),
    'mvp_scope', 'Đóng gói tính năng lõi giải quyết đúng 1 vấn đề đau nhất, gắn Repo & Demo Link đo tốc độ phản hồi thực.',
    'go_to_market', 'Xuất bản case-study lên trang chủ I2FLabs Research, mời cộng đồng Unikorn dùng thử và thu phản hồi về vòng V2.'
  );

  INSERT INTO public.venture_evaluations (
    venture_id,
    evaluator_type,
    evaluator_name,
    ai_agent_id,
    verdict,
    market_pain_score,
    feasibility_score,
    product_viability_score,
    novelty_score,
    review_note,
    ai_coaching_plan
  )
  VALUES (
    p_venture_id,
    'ai_agent',
    v_agent_name,
    v_resolved_agent_id,
    v_verdict,
    v_market_score,
    v_feasibility_score,
    v_product_score,
    v_novelty_score,
    v_note,
    v_plan
  )
  RETURNING * INTO v_inserted;

  RETURN v_inserted;
END;
$$;
