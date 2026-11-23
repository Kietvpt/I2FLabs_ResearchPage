-- ============================================================================
-- Migration: 010_auto_provision_researcher_users.sql
-- Description: Ánh xạ trực tiếp từ Supabase auth.users để tự động khởi tạo:
--              1. public.researcher_profiles (Hồ sơ Researcher chính thức)
--              2. public.admin_profiles (Cấp quyền editor/admin cho Workspace RLS)
--              3. public.researcher_ai_agents (Khởi tạo sẵn 1 Cộng sự AI Twin cá nhân)
--              Bao gồm Trigger realtime khi thêm user trên Supabase Auth + Backfill user cũ.
-- Author: I2FLabs Institute of AI & Cognitive Architecture
-- ============================================================================

-- 1. Bảng Hồ sơ Researcher ánh xạ 1-1 từ auth.users
CREATE TABLE IF NOT EXISTS public.researcher_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'researcher'
    CHECK (role IN ('admin', 'researcher', 'reviewer', 'editor')),
  specialty_focus TEXT NOT NULL DEFAULT 'Human–AI Collaborative Research',
  avatar_url TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_researcher_profiles_status ON public.researcher_profiles(status);

DROP TRIGGER IF EXISTS set_researcher_profiles_updated_at ON public.researcher_profiles;
CREATE TRIGGER set_researcher_profiles_updated_at
  BEFORE UPDATE ON public.researcher_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.researcher_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view researcher profiles" ON public.researcher_profiles;
CREATE POLICY "Authenticated users can view researcher profiles"
  ON public.researcher_profiles FOR SELECT
  TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "Users and admins can update researcher profiles" ON public.researcher_profiles;
CREATE POLICY "Users and admins can update researcher profiles"
  ON public.researcher_profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- 2. Hàm đồng bộ từ 1 bản ghi auth.users sang các bảng Research OS
CREATE OR REPLACE FUNCTION public.sync_single_auth_user_to_researcher(p_user auth.users)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
  v_display_name TEXT;
  v_app_role TEXT;
  v_admin_role TEXT;
  v_researcher_role TEXT;
  v_specialty TEXT;
  v_avatar TEXT;
  v_ai_name TEXT;
BEGIN
  v_email := COALESCE(p_user.email, p_user.id::text || '@i2flabs.local');

  v_display_name := COALESCE(
    NULLIF(trim(p_user.raw_user_meta_data->>'full_name'), ''),
    NULLIF(trim(p_user.raw_user_meta_data->>'display_name'), ''),
    NULLIF(trim(p_user.raw_user_meta_data->>'name'), ''),
    initcap(replace(replace(split_part(v_email, '@', 1), '.', ' '), '_', ' '))
  );

  v_app_role := LOWER(COALESCE(
    NULLIF(trim(p_user.raw_app_meta_data->>'role'), ''),
    NULLIF(trim(p_user.raw_user_meta_data->>'role'), ''),
    'researcher'
  ));

  IF v_app_role = 'admin' THEN
    v_admin_role := 'admin';
    v_researcher_role := 'admin';
  ELSE
    v_admin_role := 'editor';
    v_researcher_role := CASE
      WHEN v_app_role IN ('researcher', 'reviewer', 'editor') THEN v_app_role
      ELSE 'researcher'
    END;
  END IF;

  v_specialty := COALESCE(
    NULLIF(trim(p_user.raw_user_meta_data->>'specialty_focus'), ''),
    NULLIF(trim(p_user.raw_user_meta_data->>'specialty'), ''),
    'Human–AI Collaborative Research'
  );

  v_avatar := NULLIF(trim(p_user.raw_user_meta_data->>'avatar_url'), '');

  -- 2.1 Đồng bộ public.researcher_profiles
  INSERT INTO public.researcher_profiles (
    user_id, email, display_name, role, specialty_focus, avatar_url, status
  )
  VALUES (
    p_user.id, v_email, v_display_name, v_researcher_role, v_specialty, v_avatar, 'active'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = COALESCE(NULLIF(EXCLUDED.display_name, ''), public.researcher_profiles.display_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.researcher_profiles.avatar_url),
    updated_at = NOW();

  -- 2.2 Đồng bộ public.admin_profiles để RLS cho phép tạo đề tài/thẩm định/bài viết
  INSERT INTO public.admin_profiles (user_id, display_name, role)
  VALUES (p_user.id, v_display_name, v_admin_role)
  ON CONFLICT (user_id) DO UPDATE SET
    display_name = COALESCE(NULLIF(EXCLUDED.display_name, ''), public.admin_profiles.display_name);

  -- 2.3 Khởi tạo sẵn 1 Cộng sự AI cá nhân mặc định nếu bảng đã tồn tại và user chưa có AI riêng
  IF to_regclass('public.researcher_ai_agents') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.researcher_ai_agents WHERE owner_user_id = p_user.id
     ) THEN
    v_ai_name := COALESCE(
      NULLIF(trim(p_user.raw_user_meta_data->>'ai_agent_name'), ''),
      split_part(v_display_name, ' ', 1) || ' AI'
    );

    INSERT INTO public.researcher_ai_agents (
      owner_user_id,
      owner_name,
      agent_name,
      persona_aid,
      pod_role,
      ai_scope,
      specialty_focus,
      model_name,
      status
    )
    VALUES (
      p_user.id,
      v_display_name,
      v_ai_name,
      'AI-' || upper(substr(replace(p_user.id::text, '-', ''), 1, 8)),
      'explorer',
      'pod_shared',
      'Cộng sự AI đồng hành nghiên cứu & phát triển cùng ' || v_display_name,
      'Gemini 3.8 Flash High',
      'online'
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Không bao giờ làm lỗi quá trình tạo/đăng nhập user trên Supabase Auth
    RAISE WARNING 'sync_single_auth_user_to_researcher warning for %: %', p_user.id, SQLERRM;
END;
$$;

-- 3. Trigger tự động chạy mỗi khi Master thêm hoặc cập nhật User trên Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_auth_user_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.sync_single_auth_user_to_researcher(NEW);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_researcher ON auth.users;
CREATE TRIGGER on_auth_user_created_researcher
  AFTER INSERT OR UPDATE OF email, raw_user_meta_data, raw_app_meta_data
  ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_auth_user_sync();

-- 4. Backfill tự động toàn bộ User đang có sẵn trong auth.users ngay khi chạy migration này
DO $$
DECLARE
  r auth.users%ROWTYPE;
BEGIN
  FOR r IN SELECT * FROM auth.users LOOP
    PERFORM public.sync_single_auth_user_to_researcher(r);
  END LOOP;
END $$;
