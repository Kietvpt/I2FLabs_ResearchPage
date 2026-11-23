import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FilePlus2,
  FileText,
  FolderArchive,
  KanbanSquare,
  LayoutGrid,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  Plus,
  Rocket,
  Sun,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { DomainSelector } from '@/components/domains/DomainSelector';
import { WorkspaceChatDrawer } from '@/features/workspace/WorkspaceChatDrawer';
import { cn } from '@/lib/utils';
import badgeDark from '@/assets/logos/i2f-badge-dark.png';
import badgeLight from '@/assets/logos/i2f-badge-light.png';

const WORKSPACE_NAV_ITEMS = [
  { to: '/admin/forge', label: 'Research Playground', icon: Rocket, end: false },
  { to: '/admin/reports', label: 'Ấn phẩm & Báo cáo', icon: FileText, end: false },
  { to: '/admin/tasks', label: 'Task & Bounties', icon: KanbanSquare, end: false },
  { to: '/admin/researchers', label: 'Đội ngũ & Cộng sự AI', icon: Users, end: false },
  { to: '/admin/resources', label: 'Tài nguyên & Lĩnh vực', icon: FolderArchive, end: false },
];

const SHORTCUT_NAV_ITEMS = [
  { to: '/admin/reports/new', label: 'Viết báo cáo mới', icon: FilePlus2, end: false },
];

const ROUTE_TITLES: Array<{ prefix: string; title: string; subtitle: string }> = [
  { prefix: '/admin/forge', title: 'Research Playground', subtitle: 'Không gian social cho ý tưởng, nghiên cứu cộng sinh & sản phẩm' },
  { prefix: '/admin/reports/new', title: 'Report Studio', subtitle: 'Soạn thảo hoặc import bài báo cáo khoa học' },
  { prefix: '/admin/reports', title: 'Ấn phẩm & Báo cáo', subtitle: 'Quản lý bản nháp, thẩm định Gate 2 & xuất bản tri thức' },
  { prefix: '/admin/tasks', title: 'Task & Bounties', subtitle: 'Điều phối nhiệm vụ kéo thả giữa Human Team & AI Fleet' },
  { prefix: '/admin/researchers', title: 'Đội ngũ & Cộng sự AI', subtitle: 'Quản lý Human Team & dàn Personal AI Twins theo từng thành viên' },
  { prefix: '/admin/resources', title: 'Tài nguyên & Lĩnh vực', subtitle: 'Lĩnh vực chiến lược, kho datasets/codebase & thư viện media' },
  { prefix: '/admin', title: 'I2FLabs Research OS', subtitle: 'Cổng tri thức & Không gian nghiên cứu cộng sinh' },
];

export function AdminLayout() {
  const { adminProfile, user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const isLauncherPage = location.pathname === '/admin' || location.pathname === '/admin/';

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

  const currentMeta =
    ROUTE_TITLES.find((item) => location.pathname.startsWith(item.prefix)) ??
    ROUTE_TITLES[ROUTE_TITLES.length - 1];

  const handleSignOut = async () => {
    await signOut();
    toast.success('Đã đăng xuất khỏi Workspace');
    navigate('/admin/login', { replace: true });
  };

  const renderNavGroup = (
    title: string,
    items: typeof WORKSPACE_NAV_ITEMS,
    isMobile: boolean
  ) => (
    <div className="space-y-1">
      {(!collapsed || isMobile) && (
        <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted/80">
          {title}
        </div>
      )}
      {items.map(({ to, label, icon: Icon, end }) => (
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
                ? 'bg-subtle text-foreground'
                : 'text-muted hover:text-foreground hover:bg-subtle/50',
              collapsed && !isMobile && 'justify-center px-2'
            )
          }
        >
          <Icon className="w-4 h-4 shrink-0" />
          {(!collapsed || isMobile) && <span className="truncate">{label}</span>}
        </NavLink>
      ))}
    </div>
  );

  const renderNavContent = (isMobile = false) => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="h-14 px-3.5 flex items-center justify-between border-b border-border shrink-0">
        <Link
          to="/admin"
          onClick={() => isMobile && setMobileOpen(false)}
          className="flex items-center gap-2.5 min-w-0"
        >
          <img
            src={badgeLight}
            alt="I2FLabs Logo"
            className="h-7 w-7 rounded-md object-contain shadow-sm shrink-0 dark:hidden"
          />
          <img
            src={badgeDark}
            alt="I2FLabs Logo"
            className="hidden h-7 w-7 rounded-md object-contain shadow-sm shrink-0 dark:block"
          />
          {(!collapsed || isMobile) && (
            <div className="truncate">
              <div className="text-sm font-semibold text-foreground leading-none">I2FLabs</div>
              <div className="text-[10px] text-muted mt-0.5">Research OS</div>
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

      {/* Domain Workspace Selector */}
      {(!collapsed || isMobile) && (
        <div className="p-2.5 border-b border-border/70 shrink-0">
          <div className="text-[10px] uppercase tracking-wider text-muted mb-1.5 px-0.5">
            Không gian miền
          </div>
          <DomainSelector variant="sidebar" className="w-full" />
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-2.5 space-y-4 overflow-y-auto">
        <NavLink
          to="/admin"
          end
          onClick={() => isMobile && setMobileOpen(false)}
          title={collapsed && !isMobile ? 'Tất cả Ứng dụng' : undefined}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium border transition-colors',
              isActive
                ? 'bg-foreground text-canvas border-foreground'
                : 'border-border/70 bg-canvas text-foreground hover:bg-subtle',
              collapsed && !isMobile && 'justify-center px-2'
            )
          }
        >
          <LayoutGrid className="w-4 h-4 shrink-0" />
          {(!collapsed || isMobile) && <span className="truncate">Tất cả Ứng dụng</span>}
        </NavLink>

        {renderNavGroup('Không gian chính', WORKSPACE_NAV_ITEMS, isMobile)}
        {renderNavGroup('Lối tắt', SHORTCUT_NAV_ITEMS, isMobile)}
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
            <div className="text-[11px] text-muted truncate">{user?.email}</div>
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
      {/* Desktop Sidebar (Hidden on /admin App Grid Launcher) */}
      {!isLauncherPage && (
        <aside
          className={cn(
            'hidden md:flex flex-col border-r border-border bg-surface sticky top-0 h-screen transition-all duration-200 shrink-0',
            collapsed ? 'w-16' : 'w-60'
          )}
        >
          {renderNavContent(false)}
        </aside>
      )}

      {/* Mobile Drawer */}
      {!isLauncherPage && mobileOpen && (
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
        {isLauncherPage ? (
          /* No-Sidebar App Launcher Topbar */
          <header className="h-14 px-4 sm:px-6 border-b border-border bg-surface/85 backdrop-blur-sm flex items-center justify-between gap-3 sticky top-0 z-30 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <Link to="/admin" className="flex items-center gap-2.5 shrink-0">
                <img
                  src={badgeLight}
                  alt="I2FLabs Logo"
                  className="h-7 w-7 rounded-md object-contain shadow-sm dark:hidden"
                />
                <img
                  src={badgeDark}
                  alt="I2FLabs Logo"
                  className="hidden h-7 w-7 rounded-md object-contain shadow-sm dark:block"
                />
                <div className="leading-none">
                  <span className="text-sm font-semibold text-foreground">I2FLabs</span>
                  <span className="hidden sm:inline text-xs text-muted ml-1.5">· Research OS</span>
                </div>
              </Link>

              <div className="hidden sm:block h-4 w-px bg-border" />
              <div className="hidden sm:block w-52">
                <DomainSelector variant="sidebar" className="w-full" />
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link
                to="/"
                target="_blank"
                rel="noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-border bg-canvas px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>View Site</span>
              </Link>

              <button
                type="button"
                onClick={toggleTheme}
                className="p-2 rounded-full border border-border bg-canvas text-muted hover:text-foreground transition-colors"
                aria-label="Đổi giao diện"
                title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
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
        ) : (
          <>
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
              <span className="font-semibold text-sm truncate">{currentMeta.title}</span>
              <div className="flex items-center gap-1">
                <Link
                  to="/admin"
                  className="p-2 rounded-lg text-muted hover:text-foreground hover:bg-subtle"
                  aria-label="Tất cả ứng dụng"
                >
                  <LayoutGrid className="w-4 h-4" />
                </Link>
                <button
                  type="button"
                  onClick={() => setChatOpen((prev) => !prev)}
                  className="p-2 rounded-lg text-muted hover:text-foreground hover:bg-subtle"
                  aria-label="Mở Symbiotic Chat"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="p-2 -mr-2 rounded-lg text-muted hover:text-foreground hover:bg-subtle"
                  aria-label="Đổi giao diện"
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
              </div>
            </header>

            {/* Desktop Workspace Topbar */}
            <header className="hidden md:flex h-14 px-6 border-b border-border bg-surface/80 backdrop-blur-sm items-center justify-between gap-4 sticky top-0 z-20 shrink-0">
              <div className="min-w-0 flex items-center gap-3">
                <Link
                  to="/admin"
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-canvas px-2.5 py-1 text-xs font-medium text-muted hover:text-foreground transition-colors shrink-0"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Apps</span>
                </Link>
                <div className="min-w-0 flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground truncate">
                    {currentMeta.title}
                  </span>
                  <span className="text-xs text-muted hidden lg:inline truncate">
                    · {currentMeta.subtitle}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link
                  to="/admin/tasks"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-canvas px-3 py-1.5 text-xs font-medium text-foreground hover:bg-subtle transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Task / Bounty</span>
                </Link>

                <button
                  type="button"
                  onClick={() => setChatOpen((prev) => !prev)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                    chatOpen
                      ? 'border-foreground bg-foreground text-canvas'
                      : 'border-border bg-canvas text-foreground hover:bg-subtle'
                  )}
                  title="Bật/tắt Symbiotic Chat Drawer (Ctrl+J)"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Team &amp; AI Chat</span>
                  <kbd className="rounded border border-current/20 px-1 text-[10px] opacity-75">
                    ⌘J
                  </kbd>
                </button>
              </div>
            </header>
          </>
        )}

        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>

      {/* Right Context Drawer: Symbiotic Human & AI Chat */}
      <WorkspaceChatDrawer open={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
}
