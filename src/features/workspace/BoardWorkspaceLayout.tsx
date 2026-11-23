import { useEffect, useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import {
  KanbanSquare,
  LayoutGrid,
  LogOut,
  MessageSquare,
  Moon,
  Rocket,
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

export function BoardWorkspaceLayout() {
  const { signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [chatOpen, setChatOpen] = useState(false);

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

  return (
    <div className="min-h-screen bg-canvas text-foreground flex flex-col">
      {/* Full-Width Board Topbar (Maximum Horizontal Width for 4 Kanban Columns) */}
      <header className="h-14 px-4 sm:px-6 border-b border-border bg-surface/90 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <Link
            to="/admin"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-canvas px-2.5 py-1.5 text-xs font-medium text-muted hover:text-foreground transition-colors shrink-0"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Apps</span>
          </Link>

          <div className="flex items-center gap-2 min-w-0">
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
            <div className="flex items-center gap-1.5 truncate">
              <KanbanSquare className="w-4 h-4 text-muted hidden sm:inline" />
              <span className="text-sm font-semibold text-foreground truncate">
                Task &amp; Bounties Board
              </span>
            </div>
          </div>

          <div className="hidden md:block h-4 w-px bg-border" />
          <div className="hidden md:block w-52">
            <DomainSelector variant="sidebar" className="w-full" />
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/admin/forge"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-border bg-canvas px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground transition-colors"
          >
            <Rocket className="w-3.5 h-3.5" />
            <span>Playground</span>
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
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Team &amp; AI Chat</span>
          </button>

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
