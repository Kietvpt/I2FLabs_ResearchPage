import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Command } from 'cmdk';
import {
  FileText,
  Moon,
  Search,
  Shield,
  Sparkles,
  Sun,
  X,
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { fetchPublishedReports, REPORT_TYPE_LABELS } from './api';

interface CommandSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandSearch({ open, onOpenChange }: CommandSearchProps) {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const { data } = useQuery({
    queryKey: ['public-reports'],
    queryFn: fetchPublishedReports,
    staleTime: 60_000,
  });

  const reports = data?.reports ?? [];

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 pt-[12vh] backdrop-blur-sm"
      onClick={() => onOpenChange(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Tìm kiếm nhanh báo cáo nghiên cứu"
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-xl border border-border bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <Command label="Tìm kiếm báo cáo I2FLabs" className="flex flex-col">
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <Search className="h-4 w-4 shrink-0 text-muted" />
            <Command.Input
              autoFocus
              placeholder="Tìm theo tiêu đề, tóm tắt, tags hoặc AI model (vd: Flow State, Gemini, Benchmark)..."
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted focus:outline-none"
            />
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded p-1 text-muted transition hover:bg-subtle hover:text-foreground"
              aria-label="Đóng"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <Command.List className="max-h-[60vh] overflow-y-auto p-2">
            <Command.Empty className="py-10 text-center text-sm text-muted">
              Không tìm thấy bài báo cáo nào khớp với từ khóa.
            </Command.Empty>

            <Command.Group
              heading="Báo cáo nghiên cứu"
              className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted"
            >
              {reports.map((report) => {
                const searchValue = [
                  report.title,
                  report.summary ?? '',
                  report.category?.name ?? '',
                  REPORT_TYPE_LABELS[report.report_type] ?? report.report_type,
                  ...(report.tags?.map((t) => t.name) ?? []),
                  ...report.model_used,
                  ...report.ai_contributors.map((a) => a.agent_name),
                ].join(' ');

                return (
                  <Command.Item
                    key={report.id}
                    value={searchValue}
                    onSelect={() => {
                      onOpenChange(false);
                      navigate(`/reports/${report.slug}`);
                    }}
                    className="flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 text-sm transition aria-selected:bg-subtle"
                  >
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-medium text-foreground">
                          {report.title}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                        {report.category && (
                          <span className="font-medium text-foreground/75">
                            {report.category.name}
                          </span>
                        )}
                        <span>•</span>
                        <span>{report.reading_time} phút đọc</span>
                        {report.model_used.length > 0 && (
                          <>
                            <span>•</span>
                            <span className="inline-flex items-center gap-1 text-ai">
                              <Sparkles className="h-3 w-3" />
                              {report.model_used[0]}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </Command.Item>
                );
              })}
            </Command.Group>

            <Command.Separator className="my-2 h-px bg-border" />

            <Command.Group
              heading="Thao tác nhanh"
              className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted"
            >
              <Command.Item
                value="toggle theme light dark giao diện sáng tối"
                onSelect={() => {
                  toggleTheme();
                  onOpenChange(false);
                }}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground aria-selected:bg-subtle"
              >
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4 text-amber-400" />
                ) : (
                  <Moon className="h-4 w-4 text-accent" />
                )}
                <span>
                  Chuyển sang giao diện {theme === 'dark' ? 'Sáng (Paper Editorial)' : 'Tối (Deep Space)'}
                </span>
              </Command.Item>

              <Command.Item
                value="admin cms quản trị viết bài"
                onSelect={() => {
                  onOpenChange(false);
                  navigate('/admin');
                }}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground aria-selected:bg-subtle"
              >
                <Shield className="h-4 w-4 text-muted" />
                <span>Mở trang Quản trị (Admin CMS)</span>
              </Command.Item>
            </Command.Group>
          </Command.List>

          <div className="flex items-center justify-between border-t border-border bg-subtle/60 px-4 py-2 text-[11px] text-muted">
            <div className="flex items-center gap-3">
              <span>
                <kbd className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono">↑↓</kbd> Di chuyển
              </span>
              <span>
                <kbd className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono">↵</kbd> Mở bài
              </span>
            </div>
            <span>
              <kbd className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono">ESC</kbd> Đóng
            </span>
          </div>
        </Command>
      </div>
    </div>
  );
}
