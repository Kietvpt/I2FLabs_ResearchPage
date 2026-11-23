import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Lock, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import badgeDark from '@/assets/logos/i2f-badge-dark.png';
import badgeLight from '@/assets/logos/i2f-badge-light.png';

export function LoginPage() {
  const { user, loading, signInWithPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fromPath =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/admin';

  if (!loading && user) {
    return <Navigate to={fromPath} replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }

    setSubmitting(true);
    const { error } = await signInWithPassword(email.trim(), password);
    setSubmitting(false);

    if (error) {
      setErrorMessage(error);
      toast.error('Đăng nhập thất bại');
      return;
    }

    toast.success('Đăng nhập thành công');
    navigate(fromPath, { replace: true });
  };

  return (
    <div className="min-h-screen bg-canvas text-foreground flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lại Thư viện Nghiên cứu
          </Link>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-8 shadow-sm">
          <div className="flex items-center gap-2.5 mb-6">
            <img
              src={badgeLight}
              alt="I2FLabs Logo"
              className="w-9 h-9 rounded-lg object-contain shadow-sm dark:hidden"
            />
            <img
              src={badgeDark}
              alt="I2FLabs Logo"
              className="hidden w-9 h-9 rounded-lg object-contain shadow-sm dark:block"
            />
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-muted">
                I2FLabs Research CMS
              </p>
              <h1 className="font-serif text-xl font-semibold text-foreground leading-tight">
                Đăng nhập Quản trị
              </h1>
            </div>
          </div>

          <p className="text-sm text-muted mb-6 leading-relaxed">
            Sử dụng tài khoản Supabase Auth của thành viên I2FLabs để soạn thảo, import báo cáo AI
            và quản lý thư viện nghiên cứu.
          </p>

          {errorMessage && (
            <div className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600 dark:text-red-400">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="login-email"
                className="block text-xs font-medium text-foreground mb-1.5"
              >
                Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="researcher@i2flabs.org"
                  className="w-full rounded-lg border border-border bg-canvas pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-medium text-foreground mb-1.5"
              >
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-border bg-canvas pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:opacity-95 disabled:opacity-60 transition-opacity"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang xác thực...
                </>
              ) : (
                'Đăng nhập vào CMS'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
