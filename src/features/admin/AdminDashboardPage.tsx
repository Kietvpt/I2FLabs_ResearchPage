import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDomains } from '@/context/DomainContext';
import {
  Eye,
  FileEdit,
  FilePlus2,
  FileUp,
  Globe,
  GlobeLock,
  Inbox,
  Loader2,
  Search,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  deleteReport,
  fetchAllReportsAdmin,
  toggleReportStatus,
} from '@/features/admin/api';
import { parseResearchMarkdown } from '@/lib/frontmatter';
import { cn, formatDate } from '@/lib/utils';
import type { ReportStatus } from '@/types/database';

const STATUS_TABS: Array<{ value: 'all' | ReportStatus; label: string }> = [
  { value: 'all', label: 'Tất cả' },
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Draft' },
  { value: 'in_review', label: 'In Review' },
  { value: 'archived', label: 'Archived' },
];

const STATUS_BADGE: Record<ReportStatus, string> = {
  published: 'border border-border bg-subtle text-foreground',
  draft: 'border border-border/50 bg-transparent text-muted',
  in_review: 'border border-border/70 bg-subtle/40 text-foreground/80',
  archived: 'border border-border/30 bg-transparent text-muted/60',
};

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const { domains, selectedDomainId, setSelectedDomainId } = useDomains();
  const [statusFilter, setStatusFilter] = useState<'all' | ReportStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const {
    data: reports = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['admin-reports'],
    queryFn: fetchAllReportsAdmin,
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, nextStatus }: { id: string; nextStatus: ReportStatus }) =>
      toggleReportStatus(id, nextStatus),
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
      void queryClient.invalidateQueries({ queryKey: ['published-reports'] });
      toast.success(
        updated.status === 'published' ? 'Đã xuất bản báo cáo' : 'Đã chuyển báo cáo về bản nháp'
      );
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteReport,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
      void queryClient.invalidateQueries({ queryKey: ['published-reports'] });
      toast.success('Đã xóa báo cáo');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const stats = useMemo(() => {
    const published = reports.filter((r) => r.status === 'published').length;
    const drafts = reports.filter((r) => r.status === 'draft' || r.status === 'in_review').length;
    return { total: reports.length, published, drafts };
  }, [reports]);

  const filteredReports = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return reports.filter((report) => {
      if (statusFilter !== 'all' && report.status !== statusFilter) return false;
      if (selectedDomainId !== 'all') {
        const matchesDomain =
          report.domain_id === selectedDomainId ||
          report.domain?.id === selectedDomainId ||
          report.domain?.slug === selectedDomainId;
        if (!matchesDomain) return false;
      }
      if (!q) return true;
      const inTitle = report.title.toLowerCase().includes(q);
      const inSlug = report.slug.toLowerCase().includes(q);
      const inType = report.report_type.toLowerCase().includes(q);
      const inDomain = (report.domain?.name ?? '').toLowerCase().includes(q);
      const inTags = (report.tags || []).some((t) => t.name.toLowerCase().includes(q));
      return inTitle || inSlug || inType || inDomain || inTags;
    });
  }, [reports, statusFilter, selectedDomainId, searchQuery]);

  const handleImportMarkdown = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = parseResearchMarkdown(text, file.name, { defaultStatus: 'draft' });
      toast.success(`Đã phân tích file "${file.name}" — mở trình soạn thảo...`);
      navigate('/admin/reports/new', {
        state: { importedReport: parsed },
      });
    } catch (err) {
      toast.error(
        `Không thể đọc file Markdown: ${err instanceof Error ? err.message : 'Lỗi không xác định'}`
      );
    }
  };

  const handleDelete = (id: string, title: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa báo cáo "${title}"? Thao tác này không thể hoàn tác.`)) {
      return;
    }
    deleteMutation.mutate(id);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-foreground">
            Quản lý Báo cáo Nghiên cứu
          </h1>
          <p className="text-sm text-muted mt-1">
            Tạo mới, chỉnh sửa hoặc import trực tiếp báo cáo Markdown từ quy trình AI Aevum.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <input
            ref={importInputRef}
            type="file"
            accept=".md,.markdown,text/markdown"
            onChange={handleImportMarkdown}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => importInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface text-foreground px-4 py-2 text-xs font-medium hover:bg-subtle transition-colors"
          >
            <FileUp className="w-3.5 h-3.5" />
            Import .md
          </button>
          <Link
            to="/admin/reports/new"
            className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-medium text-canvas hover:opacity-90 transition-opacity shadow-sm"
          >
            <FilePlus2 className="w-3.5 h-3.5" />
            New Report
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-[11px] font-mono uppercase tracking-wider text-muted">Tổng báo cáo</p>
          <p className="text-2xl font-semibold text-foreground mt-1 tabular-nums">{stats.total}</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-[11px] font-mono uppercase tracking-wider text-muted">Đã xuất bản</p>
          <p className="text-2xl font-semibold text-foreground mt-1 tabular-nums">
            {stats.published}
          </p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-[11px] font-mono uppercase tracking-wider text-muted">
            Bản nháp / Đang duyệt
          </p>
          <p className="text-2xl font-semibold text-foreground mt-1 tabular-nums">
            {stats.drafts}
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-surface border border-border rounded-xl p-3.5 mb-6 flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStatusFilter(tab.value)}
              className={cn(
                'deepmind-pill-tab',
                statusFilter === tab.value && 'active'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <select
            value={selectedDomainId}
            onChange={(e) => setSelectedDomainId(e.target.value)}
            className="rounded-lg border border-border bg-canvas px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
          >
            <option value="all">Tất cả miền nghiên cứu</option>
            {domains.map((dom) => (
              <option key={dom.id} value={dom.id}>
                {dom.name}
              </option>
            ))}
          </select>

          <div className="relative">
            <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm tiêu đề, slug, tag..."
              className="w-full sm:w-64 rounded-lg border border-border bg-canvas pl-9 pr-3 py-1.5 text-sm text-foreground placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="bg-surface border border-border rounded-xl p-12 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
          <p className="text-sm text-muted">Đang tải danh sách báo cáo...</p>
        </div>
      ) : error ? (
        <div className="bg-surface border border-red-500/30 rounded-xl p-6 text-sm text-red-600 dark:text-red-400">
          {(error as Error).message}
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl p-12 text-center">
          <Inbox className="w-8 h-8 text-muted mx-auto mb-3" />
          <p className="text-base font-medium text-foreground">Chưa có báo cáo nào phù hợp</p>
          <p className="text-sm text-muted mt-1 mb-5">
            Bắt đầu bằng cách tạo báo cáo mới hoặc nhấn Import .md để nhập nhanh từ `.aevum/research/`.
          </p>
          <div className="flex items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={() => importInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface text-foreground px-4 py-2 text-xs font-medium hover:bg-subtle transition-colors"
            >
              <FileUp className="w-3.5 h-3.5" />
              Import .md
            </button>
            <Link
              to="/admin/reports/new"
              className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-medium text-canvas hover:opacity-90 transition-opacity shadow-sm"
            >
              <FilePlus2 className="w-3.5 h-3.5" />
              Tạo báo cáo đầu tiên
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface/50 text-[11px] font-mono uppercase tracking-wider text-muted">
                  <th className="py-3 px-4 font-normal">Báo cáo</th>
                  <th className="py-3 px-4 font-normal">Miền / Loại hình</th>
                  <th className="py-3 px-4 font-normal">Trạng thái</th>
                  <th className="py-3 px-4 font-normal">Cập nhật</th>
                  <th className="py-3 px-4 text-right font-normal">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {filteredReports.map((report) => (
                  <tr key={report.id} className="hover:bg-subtle/30 transition-colors">
                    <td className="py-3.5 px-4 max-w-md">
                      <div className="font-medium text-foreground line-clamp-1">
                        <Link
                          to={`/admin/reports/${report.id}/edit`}
                          className="hover:text-muted transition-colors"
                        >
                          {report.title}
                        </Link>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted">
                        <span className="font-mono text-[11px] truncate max-w-[220px]">
                          /{report.slug}
                        </span>
                        {report.ai_contributors?.length > 0 && (
                          <>
                            <span className="text-muted/40">•</span>
                            <span className="font-mono text-[11px] text-muted">
                              w/ {report.ai_contributors.map((a) => a.agent_name).join(', ')}
                            </span>
                          </>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1 items-start">
                        <span className="text-xs font-medium text-foreground">
                          {report.domain?.name ?? 'Toàn bộ Viện'}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-border/60 text-muted">
                          {report.report_type}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono',
                          STATUS_BADGE[report.status]
                        )}
                      >
                        {report.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-xs text-muted tabular-nums">
                      {formatDate(report.updated_at)}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/admin/reports/${report.id}/edit`}
                          className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-subtle transition-colors"
                          title="Chỉnh sửa"
                        >
                          <FileEdit className="w-4 h-4" />
                        </Link>
                        {report.status === 'published' && (
                          <Link
                            to={`/reports/${report.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-subtle transition-colors"
                            title="Xem trang công khai"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                        )}
                        <button
                          type="button"
                          disabled={toggleStatusMutation.isPending}
                          onClick={() =>
                            toggleStatusMutation.mutate({
                              id: report.id,
                              nextStatus: report.status === 'published' ? 'draft' : 'published',
                            })
                          }
                          className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-subtle transition-colors"
                          title={
                            report.status === 'published' ? 'Chuyển về Draft' : 'Xuất bản ngay'
                          }
                        >
                          {report.status === 'published' ? (
                            <GlobeLock className="w-4 h-4" />
                          ) : (
                            <Globe className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          disabled={deleteMutation.isPending}
                          onClick={() => handleDelete(report.id, report.title)}
                          className="p-1.5 rounded-lg text-muted hover:text-red-400 hover:bg-subtle transition-colors"
                          title="Xóa báo cáo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
