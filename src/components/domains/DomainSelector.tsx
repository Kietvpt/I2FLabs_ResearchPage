import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Check,
  ChevronDown,
  Cpu,
  Globe,
  GraduationCap,
  Home,
  Layers,
  Plus,
  Scale,
  Settings,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useDomains } from '@/context/DomainContext';
import { cn } from '@/lib/utils';

const ICON_MAP: Record<string, typeof Cpu> = {
  Cpu,
  Activity,
  GraduationCap,
  Home,
  Scale,
  Globe,
  Layers,
};

function getDomainIcon(iconName: string) {
  return ICON_MAP[iconName] || Layers;
}

export function DomainSelector({
  variant = 'header',
  className,
}: {
  variant?: 'header' | 'sidebar' | 'compact';
  className?: string;
}) {
  const { user } = useAuth();
  const { domains, myDomains, selectedDomainId, selectedDomain, setSelectedDomainId } =
    useDomains();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const activeLabel = selectedDomain ? selectedDomain.name : 'Tất cả lĩnh vực';
  const ActiveIcon = selectedDomain ? getDomainIcon(selectedDomain.icon) : Globe;

  const institutionalDomains = domains.filter((d) => !d.created_by);
  const userCreatedDomains = myDomains;
  const otherCommunityDomains = domains.filter(
    (d) => d.created_by && d.created_by !== user?.id
  );

  return (
    <div ref={containerRef} className={cn('relative inline-block text-left', className)}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          'group inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-border-hover hover:bg-subtle/50 focus:outline-none',
          variant === 'sidebar' && 'w-full justify-between',
          isOpen && 'border-foreground/40 ring-1 ring-border-hover'
        )}
        title="Chọn hoặc chuyển đổi miền nghiên cứu"
      >
        <div className="flex items-center gap-2 min-w-0 truncate">
          <span className="flex h-4 w-4 shrink-0 items-center justify-center text-muted group-hover:text-foreground transition-colors">
            <ActiveIcon className="h-3.5 w-3.5" />
          </span>
          <span className="truncate max-w-[140px] sm:max-w-[180px] font-sans">
            {activeLabel}
          </span>
        </div>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 shrink-0 text-muted transition-transform duration-200',
            isOpen && 'rotate-180 text-foreground'
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 sm:w-80 rounded-xl border border-border bg-surface shadow-2xl z-50 p-1.5 focus:outline-none animate-in fade-in zoom-in-95 duration-150">
          {/* Header Info */}
          <div className="px-3 py-2 border-b border-border/70 mb-1 flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted">
              Miền nghiên cứu
            </span>
            {user && (
              <Link
                to="/admin/domains"
                onClick={() => setIsOpen(false)}
                className="inline-flex items-center gap-1 text-[11px] font-mono text-muted hover:text-foreground transition-colors"
              >
                <Settings className="w-3 h-3" />
                <span>Quản trị</span>
              </Link>
            )}
          </div>

          <div className="max-h-[340px] overflow-y-auto space-y-1">
            {/* Option: All Domains */}
            <button
              type="button"
              onClick={() => {
                setSelectedDomainId('all');
                setIsOpen(false);
              }}
              className={cn(
                'w-full flex items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition-colors',
                selectedDomainId === 'all'
                  ? 'bg-subtle text-foreground font-medium'
                  : 'text-muted hover:text-foreground hover:bg-subtle/50'
              )}
            >
              <div className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-muted shrink-0" />
                <div>
                  <div className="font-medium text-foreground">Toàn bộ Viện (All Domains)</div>
                  <div className="text-[10px] text-muted">
                    Tổng hợp tất cả báo cáo học thuật
                  </div>
                </div>
              </div>
              {selectedDomainId === 'all' && (
                <Check className="w-3.5 h-3.5 shrink-0 text-foreground ml-2" />
              )}
            </button>

            {/* User's Created Domains */}
            {user && userCreatedDomains.length > 0 && (
              <div className="pt-2">
                <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-muted flex items-center justify-between">
                  <span>Lĩnh vực của bạn ({userCreatedDomains.length})</span>
                </div>
                {userCreatedDomains.map((domain) => {
                  const Icon = getDomainIcon(domain.icon);
                  const isSelected =
                    selectedDomainId === domain.id || selectedDomainId === domain.slug;
                  return (
                    <button
                      key={domain.id}
                      type="button"
                      onClick={() => {
                        setSelectedDomainId(domain.id);
                        setIsOpen(false);
                      }}
                      className={cn(
                        'w-full flex items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition-colors',
                        isSelected
                          ? 'bg-subtle text-foreground font-medium'
                          : 'text-muted hover:text-foreground hover:bg-subtle/50'
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center text-muted">
                          <Icon className="w-3.5 h-3.5" />
                        </span>
                        <div className="min-w-0">
                          <div className="font-medium text-foreground truncate">
                            {domain.name}
                          </div>
                          {domain.tagline && (
                            <div className="text-[10px] text-muted truncate">
                              {domain.tagline}
                            </div>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 shrink-0 text-foreground ml-2" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Institutional Strategic Domains */}
            <div className="pt-2">
              <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-muted">
                5 Đại phân vùng viện I2FLabs
              </div>
              {institutionalDomains.map((domain) => {
                const Icon = getDomainIcon(domain.icon);
                const isSelected =
                  selectedDomainId === domain.id || selectedDomainId === domain.slug;
                return (
                  <button
                    key={domain.id}
                    type="button"
                    onClick={() => {
                      setSelectedDomainId(domain.id);
                      setIsOpen(false);
                    }}
                    className={cn(
                      'w-full flex items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition-colors',
                      isSelected
                        ? 'bg-subtle text-foreground font-medium'
                        : 'text-muted hover:text-foreground hover:bg-subtle/50'
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center text-muted">
                        <Icon className="w-3.5 h-3.5" />
                      </span>
                      <div className="min-w-0">
                        <div className="font-medium text-foreground truncate">{domain.name}</div>
                        {domain.tagline && (
                          <div className="text-[10px] text-muted truncate">{domain.tagline}</div>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 shrink-0 text-foreground ml-2" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Other Community Domains */}
            {otherCommunityDomains.length > 0 && (
              <div className="pt-2">
                <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-muted">
                  Lĩnh vực cộng đồng khác
                </div>
                {otherCommunityDomains.map((domain) => {
                  const Icon = getDomainIcon(domain.icon);
                  const isSelected =
                    selectedDomainId === domain.id || selectedDomainId === domain.slug;
                  return (
                    <button
                      key={domain.id}
                      type="button"
                      onClick={() => {
                        setSelectedDomainId(domain.id);
                        setIsOpen(false);
                      }}
                      className={cn(
                        'w-full flex items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition-colors',
                        isSelected
                          ? 'bg-subtle text-foreground font-medium'
                          : 'text-muted hover:text-foreground hover:bg-subtle/50'
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center text-muted">
                          <Icon className="w-3.5 h-3.5" />
                        </span>
                        <div className="min-w-0">
                          <div className="font-medium text-foreground truncate">
                            {domain.name}
                          </div>
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 shrink-0 text-foreground ml-2" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Action Footer */}
          {user && (
            <div className="mt-2 pt-2 border-t border-border/70">
              <Link
                to="/admin/domains"
                onClick={() => setIsOpen(false)}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-subtle/40 py-1.5 text-xs font-mono text-muted hover:text-foreground hover:bg-subtle transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tạo Miền Nghiên Cứu Mới</span>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
