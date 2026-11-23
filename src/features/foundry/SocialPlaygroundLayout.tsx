import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ExternalLink,
  Flame,
  LayoutGrid,
  LogOut,
  MessageSquare,
  Moon,
  Rocket,
  Sparkles,
  Sun,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { DomainSelector } from '@/components/domains/DomainSelector';
import { WorkspaceChatDrawer } from '@/features/workspace/WorkspaceChatDrawer';
import { cn } from '@/lib/utils';
import badgeDark from '@/assets/logos/i2f-badge-dark.png';
import badgeLight from '@/assets/logos/i2f-badge-light.png';

export function SocialPlaygroundLayout() {
  const { adminProfile, user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [chatOpen, setChatOpen] = useState(false);

  const activeStage = searchParams.get('stage') || 'all';
  const isFeedRoot = location.pathname === '/admin/forge' || location.pathname === '/admin/forge/';

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setChatOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    toast.success('Đã đăng xuất');
    navigate('/admin/login', { replace: true });
  };

  const displayName =
    adminProfile?.display_name || user?.email?.split('@')[0] || 'Researcher';

  return (
    <div className="min-h-screen bg-canvas text-foreground flex flex-col">
      {/* Dedicated Social Community Top Navbar (No Admin Sidebar) */}
      <header className="h-14 px-4 sm:px-6 border-b border-border bg-surface/90 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <Link
            to="/admin"
            title="Quay lại tất cả Ứng dụng"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-canvas px-2.5 py-1.5 text-xs font-medium text-muted hover:text-foreground transition-colors shrink-0"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Apps</span>
          </Link>

          <Link to="/admin/forge" className="flex items-center gap-2 min-w-0">
            <img
              src={badgeLight}
              alt="I2FLabs Logo"
              className="h-7 w-7 rounded-lg object-contain dark:hidden shrink-0"
            />
            <img
              src={badgeDark}
              alt="I2FLabs Logo"
              className="hidden h-7 w-7 rounded-lg object-contain dark:block shrink-0"
            />
            <div className="truncate">
              <span className="text-sm font-semibold text-foreground tracking-tight">
                Research Playground
              </span>
            </div>
          </Link>

          <div className="hidden md:block h-4 w-px bg-border" />
          <div className="hidden md:block w-48">
            <DomainSelector variant="sidebar" className="w-full" />
          </div>
        </div>

        {/* Center Social Tabs */}
        <nav className="hidden lg:flex items-center gap-1 rounded-full border border-border bg-canvas p-1">
          <Link
            to="/admin/forge"
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors',
              isFeedRoot && activeStage === 'all'
                ? 'bg-foreground text-canvas'
                : 'text-muted hover:text-foreground'
            )}
          >
            <Flame className="w-3.5 h-3.5" />
            Bảng tin
          </Link>
          <Link
            to="/admin/forge?stage=vibe_spark"
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors',
              isFeedRoot && activeStage === 'vibe_spark'
                ? 'bg-foreground text-canvas'
                : 'text-muted hover:text-foreground'
            )}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Thảo luận ý tưởng
          </Link>
          <Link
            to="/admin/forge?stage=prototype_mvp"
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors',
              isFeedRoot && (activeStage === 'prototype_mvp' || activeStage === 'unikorn_live')
                ? 'bg-foreground text-canvas'
                : 'text-muted hover:text-foreground'
            )}
          >
            <Rocket className="w-3.5 h-3.5" />
            Thành quả &amp; Demo
          </Link>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-border bg-canvas px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Trang chủ</span>
          </Link>

          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-full border border-border bg-canvas text-muted hover:text-foreground transition-colors"
            aria-label="Đổi giao diện"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => setChatOpen((prev) => !prev)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              chatOpen
                ? 'border-foreground bg-foreground text-canvas'
                : 'border-border bg-canvas text-foreground hover:bg-subtle'
            )}
            title="Chat nhóm & AI Twin (Ctrl+J)"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Chat</span>
          </button>

          <div className="hidden xl:flex items-center pl-1 text-xs font-medium text-foreground">
            {displayName}
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            title="Đăng xuất"
            className="p-2 rounded-full border border-border bg-canvas text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors"
            aria-label="Đăng xuất"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 min-w-0">
        <Outlet />
      </main>

      <WorkspaceChatDrawer open={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
}
