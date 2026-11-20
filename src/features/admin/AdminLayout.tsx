import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FilePlus2,
  FileText,
  FlaskConical,
  FolderTree,
  Image as ImageIcon,
  LogOut,
  Menu,
  Moon,
  Sun,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { to: '/admin', label: 'All Reports', icon: FileText, end: true },
  { to: '/admin/reports/new', label: 'New Report', icon: FilePlus2, end: false },
  { to: '/admin/categories', label: 'Categories', icon: FolderTree, end: false },
  { to: '/admin/media', label: 'Media Library', icon: ImageIcon, end: false },
];

export function AdminLayout() {
  const { adminProfile, user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    toast.success('Đã đăng xuất khỏi CMS');
    navigate('/admin/login', { replace: true });
  };

  const renderNavContent = (isMobile = false) => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="h-14 px-3.5 flex items-center justify-between border-b border-border shrink-0">
        <Link
          to="/admin"
          onClick={() => isMobile && setMobileOpen(false)}
          className="flex items-center gap-2.5 min-w-0"
        >
          <div className="w-8 h-8 rounded-lg bg-accent-soft text-accent flex items-center justify-center shrink-0">
            <FlaskConical className="w-4 h-4" />
          </div>
          {(!collapsed || isMobile) && (
            <div className="truncate">
              <div className="text-sm font-semibold text-foreground leading-none">I2FLabs</div>
              <div className="text-[11px] font-mono text-muted mt-0.5">Research CMS</div>
            </div>
          )}
        </Link>

        {isMobile ? (
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-subtle"
            aria-label="Đóng menu"
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-subtle"
            title={collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2.5 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => isMobile && setMobileOpen(false)}
            title={collapsed && !isMobile ? label : undefined}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent-soft text-accent'
                  : 'text-muted hover:text-foreground hover:bg-subtle',
                collapsed && !isMobile && 'justify-center px-2'
              )
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            {(!collapsed || isMobile) && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer Actions */}
      <div className="p-2.5 border-t border-border space-y-1 shrink-0">
        <Link
          to="/"
          target="_blank"
          rel="noreferrer"
          title={collapsed && !isMobile ? 'View Site' : undefined}
          className={cn(
            'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted hover:text-foreground hover:bg-subtle transition-colors',
            collapsed && !isMobile && 'justify-center px-2'
          )}
        >
          <ExternalLink className="w-4 h-4 shrink-0" />
          {(!collapsed || isMobile) && <span>View Site</span>}
        </Link>

        <button
          type="button"
          onClick={toggleTheme}
          title={collapsed && !isMobile ? 'Đổi giao diện' : undefined}
          className={cn(
            'w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted hover:text-foreground hover:bg-subtle transition-colors',
            collapsed && !isMobile && 'justify-center px-2'
          )}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 shrink-0" />
          ) : (
            <Moon className="w-4 h-4 shrink-0" />
          )}
          {(!collapsed || isMobile) && (
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          )}
        </button>

        {(!collapsed || isMobile) && (
          <div className="px-3 py-2 mt-1 rounded-lg bg-subtle/70 border border-border/60">
            <div className="text-xs font-medium text-foreground truncate">
              {adminProfile?.display_name || 'Lab Admin'}
            </div>
            <div className="text-[11px] font-mono text-muted truncate">{user?.email}</div>
          </div>
        )}

        <button
          type="button"
          onClick={handleSignOut}
          title={collapsed && !isMobile ? 'Đăng xuất' : undefined}
          className={cn(
            'w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors',
            collapsed && !isMobile && 'justify-center px-2'
          )}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {(!collapsed || isMobile) && <span>Đăng xuất</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-canvas text-foreground flex">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden md:flex flex-col border-r border-border bg-surface sticky top-0 h-screen transition-all duration-200 shrink-0',
          collapsed ? 'w-16' : 'w-60'
        )}
      >
        {renderNavContent(false)}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-64 max-w-[80vw] bg-surface border-r border-border h-full z-10">
            {renderNavContent(true)}
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile Topbar */}
        <header className="md:hidden h-14 px-4 border-b border-border bg-surface flex items-center justify-between sticky top-0 z-30">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="p-2 -ml-2 rounded-lg text-muted hover:text-foreground hover:bg-subtle"
            aria-label="Mở menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-serif font-semibold text-sm">I2FLabs CMS</span>
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 -mr-2 rounded-lg text-muted hover:text-foreground hover:bg-subtle"
            aria-label="Đổi giao diện"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </header>

        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
