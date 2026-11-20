import type { ReactNode } from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Copy, Loader2, LogOut, RefreshCw, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

export function ProtectedRoute({ children }: { children?: ReactNode }) {
  const { user, isAdmin, loading, signOut, refreshProfile } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas text-foreground flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
        <p className="text-sm text-muted">Đang kiểm tra phiên quản trị...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    const grantSql = `INSERT INTO public.admin_profiles (user_id, display_name, role)\nVALUES ('${user.id}', 'Master', 'admin')\nON CONFLICT (user_id) DO NOTHING;`;

    const handleCopySql = async () => {
      try {
        await navigator.clipboard.writeText(grantSql);
        toast.success('Đã sao chép câu lệnh SQL cấp quyền Admin');
      } catch {
        toast.error('Không thể sao chép tự động, vui lòng copy thủ công.');
      }
    };

    const handleRefresh = async () => {
      await refreshProfile();
      toast.info('Đã kiểm tra lại quyền truy cập.');
    };

    return (
      <div className="min-h-screen bg-canvas text-foreground flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-xl bg-surface border border-border rounded-2xl p-8 shadow-sm">
          <div className="flex items-start gap-3.5 mb-5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-serif text-xl font-semibold text-foreground">
                Tài khoản chưa được cấp quyền Admin CMS
              </h1>
              <p className="text-sm text-muted mt-1">
                Bạn đã đăng nhập với email{' '}
                <span className="font-mono text-foreground">{user.email}</span>, nhưng User ID này
                chưa có mặt trong bảng <code className="font-mono text-xs">admin_profiles</code>.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-subtle p-4 mb-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-muted">
                Chạy câu SQL sau trên Supabase SQL Editor:
              </span>
              <button
                type="button"
                onClick={handleCopySql}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy SQL
              </button>
            </div>
            <pre className="text-xs font-mono text-foreground overflow-x-auto whitespace-pre-wrap leading-relaxed">
              {grantSql}
            </pre>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRefresh}
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-95"
              >
                <RefreshCw className="w-4 h-4" />
                Kiểm tra lại quyền
              </button>
              <button
                type="button"
                onClick={() => void signOut()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-canvas px-4 py-2 text-sm font-medium text-foreground hover:bg-subtle"
              >
                <LogOut className="w-4 h-4" />
                Đăng xuất
              </button>
            </div>

            <Link to="/" className="text-sm text-muted hover:text-foreground">
              Về trang chủ →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children ?? <Outlet />}</>;
}
