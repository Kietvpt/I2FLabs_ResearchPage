-- ============================================================================
-- Migration: 003_member_domain_management.sql
-- Description: Cho phép mỗi thành viên sau khi đăng nhập có thể chọn các miền nghiên cứu
--              và toàn quyền quản trị các miền nghiên cứu do tài khoản mình tạo ra.
-- Author: I2FLabs Institute of AI & Cognitive Architecture
-- ============================================================================

-- 1. Cập nhật default cho cột created_by trong research_domains
ALTER TABLE public.research_domains 
  ALTER COLUMN created_by SET DEFAULT auth.uid();

-- 2. Cập nhật Policy RLS cho research_domains:
-- Cho phép bất kỳ user đã đăng nhập (authenticated) xem, tạo miền của mình và quản trị miền mình tạo
DROP POLICY IF EXISTS "Public can view active research domains" ON public.research_domains;
DROP POLICY IF EXISTS "Admins can manage research domains" ON public.research_domains;
DROP POLICY IF EXISTS "Members can view active or own research domains" ON public.research_domains;
DROP POLICY IF EXISTS "Authenticated users can create research domains" ON public.research_domains;
DROP POLICY IF EXISTS "Domain owners and admins can update research domains" ON public.research_domains;
DROP POLICY IF EXISTS "Domain owners and admins can delete research domains" ON public.research_domains;

-- 2.1 SELECT: Khách xem các miền active, thành viên xem thêm các miền do mình tạo hoặc tham gia
CREATE POLICY "Members can view active or own research domains"
  ON public.research_domains FOR SELECT
  USING (
    is_active = TRUE 
    OR created_by = auth.uid()
    OR public.is_research_domain_member(id)
    OR public.is_admin()
  );

-- 2.2 INSERT: Thành viên đăng nhập được tạo miền nghiên cứu mới (gắn created_by = auth.uid())
CREATE POLICY "Authenticated users can create research domains"
  ON public.research_domains FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by IS NULL OR created_by = auth.uid() OR public.is_admin()
  );

-- 2.3 UPDATE: Người tạo miền, Trưởng ban (Lead), hoặc Admin hệ thống có quyền sửa
CREATE POLICY "Domain owners and admins can update research domains"
  ON public.research_domains FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() 
    OR public.is_research_domain_lead(id) 
    OR public.is_admin()
  )
  WITH CHECK (
    created_by = auth.uid() 
    OR public.is_research_domain_lead(id) 
    OR public.is_admin()
  );

-- 2.4 DELETE: Người tạo miền hoặc Admin hệ thống có quyền xóa miền
CREATE POLICY "Domain owners and admins can delete research domains"
  ON public.research_domains FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid() 
    OR public.is_admin()
  );

-- 3. Hàm Trigger: Tự động ghi danh người tạo vào Hội đồng Khoa học với vai trò chair_lead
CREATE OR REPLACE FUNCTION public.handle_new_research_domain_creator()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_email TEXT;
  v_user_name TEXT;
BEGIN
  IF NEW.created_by IS NOT NULL THEN
    -- Lấy thông tin email và name từ auth.users
    SELECT email, COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(email, '@', 1))
    INTO v_user_email, v_user_name
    FROM auth.users
    WHERE id = NEW.created_by;

    -- Thêm người tạo thành Chair Lead của miền nếu chưa có
    INSERT INTO public.research_domain_members (
      domain_id,
      user_id,
      member_name,
      email,
      member_type,
      role,
      specialty_focus,
      permissions,
      status
    )
    VALUES (
      NEW.id,
      NEW.created_by,
      COALESCE(NEW.chair_lead, v_user_name, 'Domain Lead'),
      v_user_email,
      'human',
      'chair_lead',
      'Domain Governance & Strategic Direction',
      '{
        "can_publish_report": true,
        "can_review_draft": true,
        "can_manage_datasets": true,
        "can_manage_telemetry": true,
        "can_invite_fellow": true,
        "can_create": true,
        "can_edit": true,
        "can_delete": true
      }'::jsonb,
      'active'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_domain_creator_member ON public.research_domains;
CREATE TRIGGER trigger_domain_creator_member
  AFTER INSERT ON public.research_domains
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_research_domain_creator();

-- 4. Bổ sung Policies cho research_domain_members:
-- Cho phép Domain Owner (người tạo domain) quản trị thành viên trong domain của mình
DROP POLICY IF EXISTS "Domain owners and leads can manage faculty members" ON public.research_domain_members;
CREATE POLICY "Domain owners and leads can manage faculty members"
  ON public.research_domain_members FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.research_domains 
      WHERE id = domain_id AND (created_by = auth.uid() OR public.is_research_domain_lead(domain_id))
    ) OR public.is_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.research_domains 
      WHERE id = domain_id AND (created_by = auth.uid() OR public.is_research_domain_lead(domain_id))
    ) OR public.is_admin()
  );

-- 5. Bổ sung Policies cho research_domain_resources:
-- Cho phép Domain Owner và Members thêm/sửa/xóa tài nguyên trong domain
DROP POLICY IF EXISTS "Domain owners and researchers can manage resources" ON public.research_domain_resources;
CREATE POLICY "Domain owners and researchers can manage resources"
  ON public.research_domain_resources FOR ALL
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.research_domains 
      WHERE id = domain_id AND created_by = auth.uid()
    )
    OR public.is_research_domain_lead(domain_id)
    OR public.is_research_domain_member(domain_id)
    OR public.is_admin()
  )
  WITH CHECK (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.research_domains 
      WHERE id = domain_id AND created_by = auth.uid()
    )
    OR public.is_research_domain_lead(domain_id)
    OR public.is_research_domain_member(domain_id)
    OR public.is_admin()
  );
