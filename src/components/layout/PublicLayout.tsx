import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { Moon, Search, Shield, Sparkles, Sun } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { CommandSearch } from '@/features/reports/CommandSearch';
import { cn } from '@/lib/utils';

interface PublicLayoutProps {
  children?: ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  const { theme, toggleTheme } = useTheme();
  const { isAdmin } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-foreground antialiased">
      <header className="sticky top-0 z-40 border-b border-border bg-canvas/85 backdrop-blur-md print:hidden">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <Link
              to="/"
              className="group flex items-center gap-2.5 text-foreground focus:outline-none"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface font-mono text-xs font-bold tracking-tight text-accent shadow-sm transition group-hover:border-accent/50">
                I2F
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="font-serif text-lg font-semibold tracking-tight">
                  I2FLabs
                </span>
                <span className="hidden font-mono text-xs text-muted sm:inline">
                  / Research
                </span>
              </div>
            </Link>

            <nav className="hidden items-center gap-1 md:flex" aria-label="Điều hướng chính">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-1.5 text-sm font-medium transition',
                    isActive
                      ? 'bg-subtle text-foreground'
                      : 'text-muted hover:bg-subtle/70 hover:text-foreground'
                  )
                }
              >
                Reports
              </NavLink>
              <Link
                to="/admin"
                className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted transition hover:bg-subtle/70 hover:text-foreground"
              >
                <Shield className="h-3.5 w-3.5" />
                <span>{isAdmin ? 'Admin CMS' : 'Admin'}</span>
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-muted shadow-sm transition hover:border-accent/40 hover:text-foreground"
              title="Tìm kiếm báo cáo (Ctrl+K)"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Tìm báo cáo...</span>
              <kbd className="hidden rounded border border-border bg-subtle px-1.5 py-0.5 font-mono text-[10px] text-muted md:inline">
                ⌘K
              </kbd>
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-muted shadow-sm transition hover:border-accent/40 hover:text-foreground"
              aria-label={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
              title={theme === 'dark' ? 'Light Mode (Paper Editorial)' : 'Dark Mode (Deep Space)'}
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>

            <Link
              to="/admin"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-muted shadow-sm transition hover:border-accent/40 hover:text-foreground md:hidden"
              title="Admin CMS"
              aria-label="Admin CMS"
            >
              <Shield className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">{children ?? <Outlet />}</main>

      <footer className="mt-16 border-t border-border bg-surface/50 print:hidden">
        <div className="mx-auto flex max-w-[1280px] flex-col items-start justify-between gap-4 px-4 py-8 text-xs text-muted sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <span className="font-serif text-sm font-semibold text-foreground">
              I2FLabs Research
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1 text-ai">
              <Sparkles className="h-3 w-3" />
              Human–AI Collaborative Knowledge Base
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/" className="transition hover:text-foreground">
              Thư viện báo cáo
            </Link>
            <Link to="/admin" className="transition hover:text-foreground">
              Admin CMS
            </Link>
            <span className="font-mono text-[11px] tabular-nums">
              © {new Date().getFullYear()} I2FLabs
            </span>
          </div>
        </div>
      </footer>

      <CommandSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
