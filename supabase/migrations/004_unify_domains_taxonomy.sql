-- ============================================================================
-- Migration: 004_unify_domains_taxonomy.sql
-- Description: Thống nhất phân loại nghiên cứu: Hợp nhất và tinh giản Categories
--              vào Research Domains (Miền nghiên cứu chuyên sâu).
-- Architecture Hierarchy:
--   Level 1: Research Domains (Miền nghiên cứu: Công nghệ & AI, Y tế & Y sinh,
--            Giáo dục & Nhận thức, Gia đình & Xã hội số, Kinh tế & Pháp chế, v.v.)
--   Level 2: Publication Formats (Whitepaper, Empirical PoC, Benchmark, Dialectic Debate...)
--   Level 3: Technical Tags (#flow-state, #telemetry, #multi-agent...)
-- Author: I2FLabs Institute of AI & Cognitive Architecture
-- ============================================================================

-- 1. Bổ sung liên kết ngoại từ reports sang research_domains nếu chưa có
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'reports_domain_id_fkey'
  ) THEN
    ALTER TABLE public.reports
      ADD CONSTRAINT reports_domain_id_fkey
      FOREIGN KEY (domain_id) REFERENCES public.research_domains(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- 2. Chỉ mục hỗ trợ truy vấn lọc theo miền nghiên cứu
CREATE INDEX IF NOT EXISTS idx_reports_domain_id 
  ON public.reports(domain_id);

-- 3. Đồng bộ hóa dữ liệu cũ (nếu có bài viết nào gắn category mà chưa có domain_id)
-- Tự động ánh xạ category sang domain tương ứng dựa trên slug hoặc tên miền
UPDATE public.reports r
SET domain_id = d.id
FROM public.research_domains d
WHERE r.domain_id IS NULL
  AND (
    (r.category_id IS NOT NULL AND d.slug = 'cong-nghe-tri-tue-nhan-tao' AND EXISTS (
      SELECT 1 FROM public.categories c WHERE c.id = r.category_id AND c.slug IN ('ai-cognitive-systems', 'engineering-specs', 'benchmarks-telemetry')
    ))
    OR (r.category_id IS NOT NULL AND d.slug = 'kinh-te-so-phap-che-quan-tri-ai' AND EXISTS (
      SELECT 1 FROM public.categories c WHERE c.id = r.category_id AND c.slug IN ('human-ai-debates', 'dialectic-research')
    ))
  );

-- 4. Ghi chú deprecation cho bảng categories
COMMENT ON TABLE public.categories IS 'DEPRECATED: Phân loại danh mục chung đã được hợp nhất vào public.research_domains (Miền nghiên cứu chuyên sâu).';
