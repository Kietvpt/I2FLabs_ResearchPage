-- ============================================================================
-- Migration: 002_custom_domains_and_resources.sql
-- Description: Hệ thống Lĩnh Vực Nghiên Cứu Lớn (Strategic Research Domains)
--              Phân nhóm Thành viên Hội đồng Khoa học & Quản trị Tài nguyên Nghiên cứu
-- Author: I2FLabs Institute of AI & Cognitive Architecture
-- Domains: Công nghệ & AI Tiên phong, Y tế & Khoa học Sự sống, 
--          Giáo dục & Nhận thức, Gia đình & Xã hội Số, Kinh tế & Quản trị AI
-- ============================================================================

-- 1. Research Domains (Các Lĩnh vực Nghiên cứu Chiến lược Lớn của I2FLabs)
CREATE TABLE IF NOT EXISTS public.research_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  tagline TEXT,                      -- Tôn chỉ / Hướng tiếp cận học thuật
  description TEXT,                  -- Phạm vi nghiên cứu chi tiết
  icon TEXT NOT NULL DEFAULT 'Cpu',  -- Lucide Icon: Cpu, Activity, GraduationCap, Home, Wallet
  color TEXT NOT NULL DEFAULT '#1A73E8', -- DeepMind / Google Accent
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  chair_lead TEXT,                   -- Chủ tịch Hội đồng / Trưởng ban điều phối lĩnh vực
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_research_domains_slug ON public.research_domains(slug);
CREATE INDEX IF NOT EXISTS idx_research_domains_order ON public.research_domains(is_active, sort_order);

-- 2. Liên kết Báo cáo Nghiên cứu (Reports) vào từng Lĩnh vực Lớn
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'reports' 
      AND column_name = 'domain_id'
  ) THEN
    ALTER TABLE public.reports 
    ADD COLUMN domain_id UUID REFERENCES public.research_domains(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_reports_domain_id ON public.reports(domain_id);

-- 3. Research Domain Members (Phân nhóm Thành viên & Tác tử Quản trị từng Lĩnh vực)
CREATE TABLE IF NOT EXISTS public.research_domain_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID NOT NULL REFERENCES public.research_domains(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  member_name TEXT NOT NULL,
  email TEXT,
  avatar_url TEXT,
  
  -- Phân loại Thành viên con người hay Tác tử AI chuyên trách
  member_type TEXT NOT NULL DEFAULT 'human' CHECK (
    member_type IN ('human', 'ai_persona')
  ),
  persona_aid TEXT,                  -- Mã định danh Aevum AID (ví dụ: ENG-AN-7B9F1D, ARC-IRIS-7D94D427)
  
  -- Vai trò trong Hội đồng Khoa học Lĩnh vực
  role TEXT NOT NULL DEFAULT 'researcher' CHECK (
    role IN (
      'chair_lead',              -- Trưởng ban Nghiên cứu Lĩnh vực (Lead Scientist)
      'principal_investigator',  -- Nghiên cứu viên Chính
      'lead_reviewer',           -- Trưởng ban Thẩm định & Phản biện Đồng đẳng
      'researcher',              -- Nghiên cứu viên
      'fellow',                  -- Cộng tác viên / Nghiên cứu sinh
      'advisor'                  -- Cố vấn Chiến lược
    )
  ),
  specialty_focus TEXT,              -- Mảng chuyên môn hẹp phụ trách trong Domain
  
  -- Phân quyền quản trị tài nguyên học thuật
  permissions JSONB NOT NULL DEFAULT '{
    "can_publish_report": true,
    "can_review_draft": true,
    "can_manage_datasets": true,
    "can_manage_telemetry": true,
    "can_invite_fellow": false
  }'::jsonb,
  
  status TEXT NOT NULL DEFAULT 'active' CHECK (
    status IN ('active', 'emeritus', 'suspended')
  ),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_domain_members_domain ON public.research_domain_members(domain_id);
CREATE INDEX IF NOT EXISTS idx_domain_members_user ON public.research_domain_members(user_id);
CREATE INDEX IF NOT EXISTS idx_domain_members_aid ON public.research_domain_members(persona_aid);

-- 4. Research Domain Resources (Kho Tài nguyên Riêng của từng Lĩnh vực Nghiên cứu)
CREATE TABLE IF NOT EXISTS public.research_domain_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID NOT NULL REFERENCES public.research_domains(id) ON DELETE CASCADE,
  report_id UUID REFERENCES public.reports(id) ON DELETE SET NULL, -- Tùy chọn liên kết trực tiếp bài báo
  title TEXT NOT NULL,
  slug TEXT,
  
  -- Phân loại tài nguyên học thuật đặc thù
  resource_type TEXT NOT NULL DEFAULT 'dataset' CHECK (
    resource_type IN (
      'dataset',            -- Bộ dữ liệu thực nghiệm, benchmark dataset
      'benchmark_suite',    -- Kịch bản đo kiểm, stress-test harness
      'code_artifact',      -- Trọng số mô hình, source code thuật toán
      'methodology_spec',   -- Đặc tả quy chuẩn phương pháp luận (Protocol)
      'telemetry_dump',     -- Bản ghi telemetry thời gian thực, vitals, logs
      'peer_review',        -- Bản thẩm định phản biện đồng đẳng độc lập
      'literature_review',  -- Tổng quan tài liệu, đồ thị tri thức trích dẫn
      'domain_handbook'     -- Cẩm nang tiêu chuẩn nghiệp vụ lĩnh vực
    )
  ),
  description TEXT,
  content_md TEXT NOT NULL DEFAULT '', -- Tài liệu chi tiết dạng Markdown
  file_url TEXT,                        -- Tệp dữ liệu / artifacts đính kèm
  doi_or_arxiv TEXT,                    -- Mã định danh khoa học quốc tế (nếu có)
  
  -- Cấu trúc dữ liệu đo kiểm linh hoạt theo lĩnh vực (Chỉ số y sinh, benchmark AI, phễu học tập...)
  telemetry_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  tags TEXT[] NOT NULL DEFAULT '{}'::text[],
  
  -- Mức độ tiếp cận
  access_level TEXT NOT NULL DEFAULT 'domain_only' CHECK (
    access_level IN ('private', 'domain_only', 'public')
  ),
  
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_member_id UUID REFERENCES public.research_domain_members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_domain_resources_domain ON public.research_domain_resources(domain_id);
CREATE INDEX IF NOT EXISTS idx_domain_resources_type ON public.research_domain_resources(resource_type);
CREATE INDEX IF NOT EXISTS idx_domain_resources_access ON public.research_domain_resources(access_level);

-- 5. Helper Functions Kiểm tra Quyền Hạn Hội Đồng Khoa Học
CREATE OR REPLACE FUNCTION public.is_research_domain_member(target_domain_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.research_domain_members
    WHERE domain_id = target_domain_id
      AND user_id = auth.uid()
      AND status = 'active'
  ) OR public.is_admin();
$$;

CREATE OR REPLACE FUNCTION public.is_research_domain_lead(target_domain_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.research_domain_members
    WHERE domain_id = target_domain_id
      AND user_id = auth.uid()
      AND role IN ('chair_lead', 'principal_investigator', 'lead_reviewer')
      AND status = 'active'
  ) OR public.is_admin();
$$;

-- 6. Triggers tự động cập nhật updated_at
CREATE OR REPLACE FUNCTION public.update_research_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_research_domains_updated ON public.research_domains;
CREATE TRIGGER trigger_research_domains_updated
  BEFORE UPDATE ON public.research_domains
  FOR EACH ROW EXECUTE FUNCTION public.update_research_timestamp();

DROP TRIGGER IF EXISTS trigger_research_domain_resources_updated ON public.research_domain_resources;
CREATE TRIGGER trigger_research_domain_resources_updated
  BEFORE UPDATE ON public.research_domain_resources
  FOR EACH ROW EXECUTE FUNCTION public.update_research_timestamp();

-- 7. Row Level Security (RLS)
ALTER TABLE public.research_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_domain_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_domain_resources ENABLE ROW LEVEL SECURITY;

-- 7.1 Policies cho research_domains
DROP POLICY IF EXISTS "Public can view active research domains" ON public.research_domains;
CREATE POLICY "Public can view active research domains"
  ON public.research_domains FOR SELECT
  USING (is_active = TRUE);

DROP POLICY IF EXISTS "Admins can manage research domains" ON public.research_domains;
CREATE POLICY "Admins can manage research domains"
  ON public.research_domains FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 7.2 Policies cho research_domain_members
DROP POLICY IF EXISTS "Public can view domain faculty and researchers" ON public.research_domain_members;
CREATE POLICY "Public can view domain faculty and researchers"
  ON public.research_domain_members FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "Domain leads and admins can manage faculty members" ON public.research_domain_members;
CREATE POLICY "Domain leads and admins can manage faculty members"
  ON public.research_domain_members FOR ALL
  USING (
    public.is_research_domain_lead(domain_id) OR public.is_admin()
  )
  WITH CHECK (
    public.is_research_domain_lead(domain_id) OR public.is_admin()
  );

-- 7.3 Policies cho research_domain_resources
DROP POLICY IF EXISTS "Public can view open scientific resources" ON public.research_domain_resources;
CREATE POLICY "Public can view open scientific resources"
  ON public.research_domain_resources FOR SELECT
  USING (
    access_level = 'public'
    OR (access_level = 'domain_only' AND public.is_research_domain_member(domain_id))
    OR (access_level = 'private' AND created_by = auth.uid())
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Domain researchers can insert scientific resources" ON public.research_domain_resources;
CREATE POLICY "Domain researchers can insert scientific resources"
  ON public.research_domain_resources FOR INSERT
  WITH CHECK (
    public.is_research_domain_member(domain_id) OR public.is_admin()
  );

DROP POLICY IF EXISTS "Authors and leads can update scientific resources" ON public.research_domain_resources;
CREATE POLICY "Authors and leads can update scientific resources"
  ON public.research_domain_resources FOR UPDATE
  USING (
    created_by = auth.uid()
    OR public.is_research_domain_lead(domain_id)
    OR public.is_admin()
  )
  WITH CHECK (
    created_by = auth.uid()
    OR public.is_research_domain_lead(domain_id)
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Authors and leads can delete scientific resources" ON public.research_domain_resources;
CREATE POLICY "Authors and leads can delete scientific resources"
  ON public.research_domain_resources FOR DELETE
  USING (
    created_by = auth.uid()
    OR public.is_research_domain_lead(domain_id)
    OR public.is_admin()
  );

-- 8. Explicit Permissions Grant
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT ON
  public.research_domains,
  public.research_domain_members,
  public.research_domain_resources
TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.research_domains,
  public.research_domain_members,
  public.research_domain_resources
TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.is_research_domain_member(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_research_domain_lead(UUID) TO anon, authenticated, service_role;

-- 9. Seed 5 Lĩnh Vực Nghiên Cứu Lớn Cốt Lõi của I2FLabs
INSERT INTO public.research_domains (name, slug, tagline, description, icon, color, sort_order, chair_lead)
VALUES
  (
    'Công nghệ & Trí tuệ Nhân tạo Tiên phong',
    'cong-nghe-ai',
    'Frontier AI, Multi-Agent Swarms & Autonomous Systems',
    'Nghiên cứu kiến trúc mô hình nền tảng, giao thức tương tác đa tác tử (IoA/PiperNet), bộ định tuyến công cụ MCP, tối ưu hóa biên dịch và hệ điều hành tác tử Aevum OS.',
    'Cpu',
    '#1A73E8',
    1,
    'Nguyễn Huy Hải (Principal Architect) & An (ENG-AN-7B9F1D)'
  ),
  (
    'Y tế, Khoa học Sự sống & Y sinh Số',
    'y-te-y-sinh',
    'Computational Biology, Neural Telemetry & Bio-Cybernetics',
    'Nghiên cứu giải mã dữ liệu sinh học phân tử, điện não đồ (EEG/BCI), thích ứng khớp thần kinh STDP, khóa pha nhận thức (CPL) và vi điều khiển sinh học hỗ trợ sức khỏe toàn diện.',
    'Activity',
    '#059669',
    2,
    'Dr. Elena (BIO-ELENA-4E119B) & Nia (NEU-NIA-9E4B2A)'
  ),
  (
    'Giáo dục, Nhận thức & Khai phóng Tư duy',
    'giao-duc-nhan-thuc',
    'Adaptive Pedagogy, Cognitive Ergonomics & Complex Systems',
    'Nghiên cứu cơ chế duy trì trạng thái dòng chảy (Flow State Cadence 50/10), mô hình hóa học tập thích ứng cá nhân hóa, lý thuyết hệ thống phức hợp và tiếp thụ đa ngôn ngữ tự nhiên.',
    'GraduationCap',
    '#7C3AED',
    3,
    'GS. Tuệ Minh (SOC-TUEMINH-9A01X) & Rei (Sensei Polyglot)'
  ),
  (
    'Gia đình, Xã hội Số & Công thái học Con người',
    'gia-dinh-xa-hoi',
    'Human-Agent Symbiosis, Multi-Generational CX & Digital Well-being',
    'Nghiên cứu thấu cảm người dùng đa thế hệ (Boomers đến Gen Alpha), giảm tải gánh nặng nhận thức (NASA-TLX), thiết kế giao diện tinh tế Quiet Luxury và bảo vệ quyền riêng tư gia đình số.',
    'Home',
    '#D97706',
    4,
    'Iris (ARC-IRIS-7D94D427) & Luna (DSN-LUNA-3C9A12)'
  ),
  (
    'Kinh tế Số, Pháp chế & Quản trị Tác tử AI',
    'kinh-te-phap-che',
    'Algorithmic Governance, FOSS Compliance & Unit Economics',
    'Nghiên cứu khung pháp lý tác tử AI tự trị, kiểm định bản quyền mở SPDX/SBOM, kinh tế học đơn vị (Unit Economics), chiến lược thị trường tinh gọn và bảo mật ranh giới hệ thống.',
    'Wallet',
    '#E11D48',
    5,
    'Justitia (LEG-JUSTITIA-7F32D) & Mira (STR-MIRA-8C4F1A)'
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  tagline = EXCLUDED.tagline,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  sort_order = EXCLUDED.sort_order,
  chair_lead = EXCLUDED.chair_lead;

-- 10. Gán các bài nghiên cứu mẫu hiện tại vào các Domain Nghiên cứu Lớn tương ứng
UPDATE public.reports
SET domain_id = (SELECT id FROM public.research_domains WHERE slug = 'cong-nghe-ai')
WHERE slug LIKE '%flow-state%' OR slug LIKE '%sandbox%' OR slug LIKE '%minimalist%' OR domain_id IS NULL;
