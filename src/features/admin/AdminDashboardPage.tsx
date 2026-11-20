import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bot,
  Eye,
  FileEdit,
  FilePlus2,
  FileUp,
  Globe,
  GlobeLock,
  Loader2,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  deleteReport,
  fetchAllReportsAdmin,
  fetchCategoriesAdmin,
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
  published: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/25',
  draft: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/25',
  in_review: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/25',
  archived: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/25',
};

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const [statusFilter, setStatusFilter] = useState<'all' | ReportStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const {
    data: reports = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['admin-reports'],
    queryFn: fetchAllReportsAdmin,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: fetchCategoriesAdmin,
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
      if (categoryFilter !== 'all' && report.category_id !== categoryFilter) return false;
      if (!q) return true;
      const inTitle = report.title.toLowerCase().includes(q);
      const inSlug = report.slug.toLowerCase().includes(q);
      const inType = report.report_type.toLowerCase().includes(q);
      const inTags = (report.tags || []).some((t) => t.name.toLowerCase().includes(q));
      return inTitle || inSlug || inType || inTags;
    });
  }, [reports, statusFilter, categoryFilter, searchQuery]);

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
            className="inline-flex items-center gap-2 rounded-lg border border-ai-border bg-ai-soft text-ai px-3.5 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <FileUp className="w-4 h-4" />
            Import .md
          </button>
          <Link
            to="/admin/reports/new"
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-95 transition-opacity"
          >
            <FilePlus2 className="w-4 h-4" />
            New Report
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-xs font-mono uppercase tracking-wider text-muted">Tổng báo cáo</p>
          <p className="text-2xl font-semibold text-foreground mt-1 tabular-nums">{stats.total}</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-xs font-mono uppercase tracking-wider text-muted">Đã xuất bản</p>
          <p className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
            {stats.published}
          </p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-xs font-mono uppercase tracking-wider text-muted">
            Bản nháp / Đang duyệt
          </p>
          <p className="text-2xl font-semibold text-amber-600 dark:text-amber-400 mt-1 tabular-nums">
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
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                statusFilter === tab.value
                  ? 'bg-accent text-white'
                  : 'text-muted hover:text-foreground hover:bg-subtle'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-border bg-canvas px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
          >
            <option value="all">Tất cả danh mục</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
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
          <Sparkles className="w-8 h-8 text-muted mx-auto mb-3" />
          <p className="text-base font-medium text-foreground">Chưa có báo cáo nào phù hợp</p>
          <p className="text-sm text-muted mt-1 mb-5">
            Bắt đầu bằng cách tạo báo cáo mới hoặc nhấn Import .md để nhập nhanh từ `.aevum/research/`.
          </p>
          <div className="flex items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={() => importInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-lg border border-ai-border bg-ai-soft text-ai px-3.5 py-2 text-sm font-medium"
            >
              <FileUp className="w-4 h-4" />
              Import .md
            </button>
            <Link
              to="/admin/reports/new"
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white"
            >
              <FilePlus2 className="w-4 h-4" />
              Tạo báo cáo đầu tiên
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-subtle/60 text-xs font-mono uppercase tracking-wider text-muted">
                  <th className="py-3 px-4">Báo cáo</th>
                  <th className="py-3 px-4">Danh mục / Loại</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4">Cập nhật</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {filteredReports.map((report) => (
                  <tr key={report.id} className="hover:bg-subtle/40 transition-colors">
                    <td className="py-3.5 px-4 max-w-md">
                      <div className="font-medium text-foreground line-clamp-1">
                        <Link
                          to={`/admin/reports/${report.id}/edit`}
                          className="hover:text-accent transition-colors"
                        >
                          {report.title}
                        </Link>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted">
                        <span className="font-mono truncate max-w-[220px]">/{report.slug}</span>
                        {report.ai_contributors?.length > 0 && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-ai-soft text-ai border border-ai-border text-[11px]">
                            <Bot className="w-3 h-3" />
                            {report.ai_contributors.map((a) => a.agent_name).join(', ')}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1 items-start">
                        {report.category ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: report.category.color }}
                            />
                            {report.category.name}
                          </span>
                        ) : (
                          <span className="text-xs text-muted">Chưa phân loại</span>
                        )}
                        <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-subtle text-muted">
                          {report.report_type}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
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
                          className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-subtle"
                          title="Chỉnh sửa"
                        >
                          <FileEdit className="w-4 h-4" />
                        </Link>
                        {report.status === 'published' && (
                          <Link
                            to={`/reports/${report.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-subtle"
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
                          className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-subtle"
                          title={report.status === 'published' ? 'Chuyển về Draft' : 'Xuất bản ngay'}
                        >
                          {report.status === 'published' ? (
                            <GlobeLock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          ) : (
                            <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          )}
                        </button>
                        <button
                          type="button"
                          disabled={deleteMutation.isPending}
                          onClick={() => handleDelete(report.id, report.title)}
                          className="p-1.5 rounded-lg text-muted hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10"
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
