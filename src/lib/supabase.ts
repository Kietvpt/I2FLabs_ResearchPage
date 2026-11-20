import { createClient, type PostgrestError } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

export const REPORT_ASSETS_BUCKET = 'report-assets';

if (!isSupabaseConfigured) {
  console.warn(
    '[Supabase] Thiếu VITE_SUPABASE_URL hoặc VITE_SUPABASE_PUBLISHABLE_KEY trong .env.local.'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabasePublishableKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

/**
 * Kiểm tra lỗi khi bảng Supabase chưa được chạy migration (PostgreSQL 42P01 / PostgREST PGRST205).
 */
export function isMissingTableError(error: PostgrestError | null | undefined): boolean {
  if (!error) return false;
  return (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    error.message?.toLowerCase().includes('does not exist') ||
    error.message?.toLowerCase().includes('could not find the table')
  );
}

/**
 * Chuẩn hóa thông báo lỗi thân thiện cho người dùng & admin khi tương tác Supabase.
 */
export function formatSupabaseError(error: PostgrestError | Error | null | undefined): string {
  if (!error) return 'Đã xảy ra lỗi không xác định.';
  if ('code' in error && isMissingTableError(error)) {
    return 'Cơ sở dữ liệu chưa được khởi tạo. Vui lòng chạy migration supabase/migrations/001_initial_schema.sql trên Supabase SQL Editor.';
  }
  return error.message || 'Không thể kết nối đến Supabase.';
}
