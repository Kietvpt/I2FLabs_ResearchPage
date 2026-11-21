-- ============================================================================
-- Migration: 005_mcp_api_keys.sql
-- Description: Bảng lưu trữ và xác thực Authentication Keys cho I2FLabs Aevum MCP Server
-- Author: I2FLabs Institute of AI & Cognitive Architecture
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.mcp_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_value TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'agent' CHECK (role IN ('admin', 'agent', 'reader')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.mcp_api_keys ENABLE ROW LEVEL SECURITY;

-- Admins can manage all MCP keys
CREATE POLICY "Admins can manage mcp_api_keys"
  ON public.mcp_api_keys FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Allow service role to query keys for validation
CREATE POLICY "Service role can access mcp_api_keys"
  ON public.mcp_api_keys FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- Tạo sẵn Default Master Key cho Aevum OS Local Node
INSERT INTO public.mcp_api_keys (key_value, name, role, is_active)
VALUES 
  ('i2f_mcp_live_sec_7f9a2b1c4e88', 'Default Aevum OS Admin Local Key', 'admin', TRUE)
ON CONFLICT (key_value) DO NOTHING;
