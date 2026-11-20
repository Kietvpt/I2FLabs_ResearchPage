-- ============================================================================
-- I2FLabs Research Page — Initial Supabase Schema, Indexes, RLS & Seed Data
-- ============================================================================

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Admin Profiles (controls write access via RLS)
CREATE TABLE IF NOT EXISTS public.admin_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('admin', 'editor')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Helper function to check admin membership safely in RLS policies
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_profiles
    WHERE user_id = auth.uid()
  );
$$;

-- 3. Categories (1-N with reports)
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#2563EB',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Reports (core research papers & technical reports)
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  summary TEXT,
  content_md TEXT NOT NULL DEFAULT '',
  cover_image_url TEXT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,

  -- Classification & Lifecycle
  report_type TEXT NOT NULL DEFAULT 'research' CHECK (
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
      'failure_mode'
    )
  ),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'in_review', 'published', 'archived')
  ),
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  version TEXT NOT NULL DEFAULT '1.0.0',
  reading_time INT NOT NULL DEFAULT 1,

  -- Human-AI Collaboration Metadata
  human_authors JSONB NOT NULL DEFAULT '[]'::jsonb,
  ai_contributors JSONB NOT NULL DEFAULT '[]'::jsonb,
  model_used TEXT[] NOT NULL DEFAULT '{}'::text[],
  collaboration_mode TEXT NOT NULL DEFAULT 'co_authored' CHECK (
    collaboration_mode IN ('human_led', 'co_authored', 'ai_assisted')
  ),
  -- Flexible JSONB for .aevum/research/ frontmatter (mission_id, node_id, inbound_edge, benchmark_metrics, sandbox_details, debate_details, etc.)
  source_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Timestamps & Audit
  published_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Tags & Join Table (N-N with reports)
CREATE TABLE IF NOT EXISTS public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.report_tags (
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (report_id, tag_id)
);

-- 6. Media Assets (tracks uploaded images in Storage bucket 'report-assets')
CREATE TABLE IF NOT EXISTS public.media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES public.reports(id) ON DELETE SET NULL,
  storage_path TEXT NOT NULL UNIQUE,
  public_url TEXT NOT NULL,
  alt_text TEXT,
  mime_type TEXT,
  size_bytes INT,
  width INT,
  height INT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Updated_at Trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_reports_updated_at ON public.reports;
CREATE TRIGGER set_reports_updated_at
  BEFORE UPDATE ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 8. Indexes (B-Tree + GIN Full-Text Search)
CREATE INDEX IF NOT EXISTS idx_reports_status_published
  ON public.reports (status, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_reports_category
  ON public.reports (category_id);

CREATE INDEX IF NOT EXISTS idx_reports_report_type
  ON public.reports (report_type);

CREATE INDEX IF NOT EXISTS idx_reports_fts
  ON public.reports
  USING GIN (
    to_tsvector(
      'simple',
      coalesce(title, '') || ' ' || coalesce(summary, '') || ' ' || coalesce(content_md, '')
    )
  );

CREATE INDEX IF NOT EXISTS idx_media_report_id
  ON public.media (report_id);

-- 9. Enable Row Level Security (RLS)
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;

-- Policies: admin_profiles
DROP POLICY IF EXISTS "Users can view own admin profile" ON public.admin_profiles;
CREATE POLICY "Users can view own admin profile"
  ON public.admin_profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Policies: categories
DROP POLICY IF EXISTS "Public can read categories" ON public.categories;
CREATE POLICY "Public can read categories"
  ON public.categories FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins can manage categories"
  ON public.categories FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Policies: reports
DROP POLICY IF EXISTS "Public can read published reports" ON public.reports;
CREATE POLICY "Public can read published reports"
  ON public.reports FOR SELECT
  USING (status = 'published' OR public.is_admin());

DROP POLICY IF EXISTS "Admins can insert reports" ON public.reports;
CREATE POLICY "Admins can insert reports"
  ON public.reports FOR INSERT
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update reports" ON public.reports;
CREATE POLICY "Admins can update reports"
  ON public.reports FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete reports" ON public.reports;
CREATE POLICY "Admins can delete reports"
  ON public.reports FOR DELETE
  USING (public.is_admin());

-- Policies: tags
DROP POLICY IF EXISTS "Public can read tags" ON public.tags;
CREATE POLICY "Public can read tags"
  ON public.tags FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "Admins can manage tags" ON public.tags;
CREATE POLICY "Admins can manage tags"
  ON public.tags FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Policies: report_tags
DROP POLICY IF EXISTS "Public can read report_tags" ON public.report_tags;
CREATE POLICY "Public can read report_tags"
  ON public.report_tags FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "Admins can manage report_tags" ON public.report_tags;
CREATE POLICY "Admins can manage report_tags"
  ON public.report_tags FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Policies: media
DROP POLICY IF EXISTS "Public can read media" ON public.media;
CREATE POLICY "Public can read media"
  ON public.media FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "Admins can manage media" ON public.media;
CREATE POLICY "Admins can manage media"
  ON public.media FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 10. Storage Bucket 'report-assets' & Policies
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'report-assets',
  'report-assets',
  TRUE,
  5242880, -- 5MB
  ARRAY['image/webp', 'image/png', 'image/jpeg', 'image/gif', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public can view report assets" ON storage.objects;
CREATE POLICY "Public can view report assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'report-assets');

DROP POLICY IF EXISTS "Admins can upload report assets" ON storage.objects;
CREATE POLICY "Admins can upload report assets"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'report-assets' AND public.is_admin());

DROP POLICY IF EXISTS "Admins can update report assets" ON storage.objects;
CREATE POLICY "Admins can update report assets"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'report-assets' AND public.is_admin())
  WITH CHECK (bucket_id = 'report-assets' AND public.is_admin());

DROP POLICY IF EXISTS "Admins can delete report assets" ON storage.objects;
CREATE POLICY "Admins can delete report assets"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'report-assets' AND public.is_admin());

-- 11. Seed Default Categories
INSERT INTO public.categories (name, slug, description, color, sort_order)
VALUES
  ('AI & Cognitive Systems', 'ai-cognitive-systems', 'Nghiên cứu về hệ thống AI, tối ưu hóa Flow State và cộng tác nhận thức giữa người và máy.', '#7C3AED', 1),
  ('System Architecture', 'system-architecture', 'Thiết kế kiến trúc phân tán, hạ tầng dữ liệu và mô hình hệ thống quy mô lớn.', '#2563EB', 2),
  ('Benchmarks & Telemetry', 'benchmarks-telemetry', 'Đo lường thực nghiệm, kiểm thử hiệu năng, phân tích thống kê và bằng chứng định lượng.', '#059669', 3),
  ('Engineering & Specs', 'engineering-specs', 'Đặc tả kỹ thuật (RFC/Spec), Proof-of-Concept và đánh đổi công nghệ.', '#D97706', 4),
  ('Human-AI Debates', 'human-ai-debates', 'Các phiên phản biện đa chiều giữa chuyên gia và AI Personas về giả thuyết và rủi ro.', '#E11D48', 5)
ON CONFLICT (slug) DO NOTHING;

-- 12. Explicit Role Grants (Supabase anon / authenticated / service_role)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT ON
  public.categories,
  public.reports,
  public.tags,
  public.report_tags,
  public.media
TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.admin_profiles,
  public.categories,
  public.reports,
  public.tags,
  public.report_tags,
  public.media
TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;

