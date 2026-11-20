import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  BookOpen,
  Clock,
  Copy,
  Database,
  LayoutGrid,
  List,
  RotateCcw,
  Search,
  Sparkles,
  Tag as TagIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import type { ReportType, ReportWithRelations } from '@/types/database';
import { cn, formatDate } from '@/lib/utils';
import { fetchPublishedReports, REPORT_TYPE_LABELS } from './api';

function GeometricCover({
  color = '#4F46E5',
  label,
  compact = false,
}: {
  color?: string;
  label?: string;
  compact?: boolean;
}) {
  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${color}18 0%, ${color}08 55%, transparent 100%)`,
      }}
    >
      <svg
        className="h-full w-full opacity-45 dark:opacity-35"
        viewBox="0 0 400 225"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <pattern
            id={`grid-${color.replace('#', '')}`}
            width="24"
            height="24"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 24 0 L 0 0 0 24"
              fill="none"
              stroke={color}
              strokeOpacity="0.22"
              strokeWidth="0.75"
            />
          </pattern>
        </defs>
        <rect
          width="400"
          height="225"
          fill={`url(#grid-${color.replace('#', '')})`}
        />
        <circle
          cx="320"
          cy="56"
          r="72"
          stroke={color}
          strokeOpacity="0.35"
          strokeWidth="1.2"
        />
        <circle
          cx="320"
          cy="56"
          r="42"
          fill={color}
          fillOpacity="0.12"
        />
        <circle
          cx="82"
          cy="176"
          r="48"
          stroke={color}
          strokeOpacity="0.25"
          strokeDasharray="4 4"
          strokeWidth="1.2"
        />
      </svg>
      {label && !compact && (
        <span
          className="absolute bottom-3 left-3 rounded-md border bg-surface/85 px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider backdrop-blur-sm"
          style={{ borderColor: `${color}40`, color }}
        >
          {label}
        </span>
      )}
    </div>
  );
}

function getAiBadgeText(report: ReportWithRelations): string | null {
  if (report.ai_contributors.length > 0) {
    const names = report.ai_contributors.map((a) => a.agent_name).slice(0, 2);
    const suffix =
      report.ai_contributors.length > 2
        ? ` +${report.ai_contributors.length - 2}`
        : '';
    return `w/ ${names.join(', ')}${suffix}`;
  }
  if (report.model_used.length > 0) {
    return `w/ ${report.model_used[0]}`;
  }
  return null;
}

function ReportCard({ report }: { report: ReportWithRelations }) {
  const accentColor = report.category?.color || '#4F46E5';
  const aiBadge = getAiBadgeText(report);

  return (
    <Link
      to={`/reports/${report.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md"
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden border-b border-border bg-subtle">
        {report.cover_image_url ? (
          <img
            src={report.cover_image_url}
            alt={report.title}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <GeometricCover
            color={accentColor}
            label={REPORT_TYPE_LABELS[report.report_type]}
          />
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2.5 flex flex-wrap items-center gap-2 text-xs text-muted">
          {report.category && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-medium"
              style={{
                backgroundColor: `${accentColor}16`,
                color: accentColor,
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: accentColor }}
              />
              {report.category.name}
            </span>
          )}
          <span className="font-mono text-[11px] tabular-nums">
            {formatDate(report.published_at ?? report.created_at)}
          </span>
          <span className="inline-flex items-center gap-1 font-mono text-[11px] tabular-nums">
            <Clock className="h-3 w-3" />
            {report.reading_time} phút
          </span>
        </div>

        <h3 className="line-clamp-2 font-serif text-lg font-semibold leading-snug tracking-tight text-foreground transition group-hover:text-accent">
          {report.title}
        </h3>

        {report.summary && (
          <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-muted">
            {report.summary}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3.5">
          {aiBadge ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-ai-border bg-ai-soft px-2.5 py-0.5 text-[11px] font-medium text-ai">
              <Sparkles className="h-3 w-3" />
              {aiBadge}
            </span>
          ) : (
            <span className="font-mono text-[11px] text-muted">
              v{report.version}
            </span>
          )}

          {report.tags && report.tags.length > 0 && (
            <div className="flex items-center gap-1.5">
              {report.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag.id}
                  className="rounded bg-subtle px-1.5 py-0.5 font-mono text-[10px] text-muted"
                >
                  #{tag.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['public-reports'],
    queryFn: fetchPublishedReports,
    staleTime: 60_000,
  });

  const reports = data?.reports ?? [];
  const categories = data?.categories ?? [];
  const needsMigration = data?.needsMigration ?? false;

  const isFiltering =
    selectedCategory !== 'all' ||
    selectedType !== 'all' ||
    searchQuery.trim().length > 0;

  const featuredReport = useMemo(() => {
    if (isFiltering || reports.length === 0) return null;
    return reports.find((r) => r.is_featured) ?? reports[0];
  }, [reports, isFiltering]);

  const availableTypes = useMemo(() => {
    const set = new Set<ReportType>();
    reports.forEach((r) => set.add(r.report_type));
    return Array.from(set);
  }, [reports]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const rep of reports) {
      if (rep.category_id) {
        counts.set(rep.category_id, (counts.get(rep.category_id) ?? 0) + 1);
      }
    }
    return counts;
  }, [reports]);

  const filteredReports = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return reports.filter((report) => {
      if (
        !isFiltering &&
        featuredReport &&
        report.id === featuredReport.id &&
        reports.length > 1
      ) {
        return false;
      }
      if (selectedCategory !== 'all' && report.category_id !== selectedCategory) {
        return false;
      }
      if (selectedType !== 'all' && report.report_type !== selectedType) {
        return false;
      }
      if (q) {
        const haystack = [
          report.title,
          report.summary ?? '',
          report.category?.name ?? '',
          REPORT_TYPE_LABELS[report.report_type] ?? '',
          ...(report.tags?.map((t) => t.name) ?? []),
          ...report.model_used,
          ...report.ai_contributors.map((a) => a.agent_name),
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [
    reports,
    isFiltering,
    featuredReport,
    selectedCategory,
    selectedType,
    searchQuery,
  ]);

  const resetFilters = () => {
    setSelectedCategory('all');
    setSelectedType('all');
    setSearchQuery('');
  };

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6 lg:px-8">
      {needsMigration && (
        <div className="mb-8 flex flex-col justify-between gap-3 rounded-xl border border-ai-border bg-ai-soft/70 px-4 py-3.5 text-sm sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <Database className="mt-0.5 h-4 w-4 shrink-0 text-ai" />
            <div>
              <p className="font-medium text-foreground">
                Đang hiển thị dữ liệu mẫu từ{' '}
                <code className="rounded bg-surface/80 px-1.5 py-0.5 font-mono text-xs">
                  .aevum/research/
                </code>
              </p>
              <p className="mt-0.5 text-xs text-muted">
                Chạy file SQL{' '}
                <code className="font-mono text-foreground">
                  supabase/migrations/001_initial_schema.sql
                </code>{' '}
                trên Supabase SQL Editor để kích hoạt cơ sở dữ liệu thật và Admin CMS.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(
                'supabase/migrations/001_initial_schema.sql'
              );
              toast.success('Đã sao chép đường dẫn file migration');
            }}
            className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg border border-ai-border bg-surface px-3 py-1.5 text-xs font-medium text-ai transition hover:bg-ai-soft sm:self-center"
          >
            <Copy className="h-3.5 w-3.5" />
            Copy SQL path
          </button>
        </div>
      )}

      {/* Editorial Hero */}
      <section className="pb-8 pt-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-ai-border bg-ai-soft px-3 py-1 text-xs font-medium text-ai">
          <Sparkles className="h-3.5 w-3.5" />
          <span>I2FLabs • Human–AI Collaborative Research</span>
        </div>
        <h1 className="mt-4 max-w-3xl font-serif text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-[2.65rem] lg:leading-[1.15]">
          Thư viện Nghiên cứu, Đo kiểm & Báo cáo Kỹ thuật
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted">
          Nơi lưu trữ và xuất bản các bài nghiên cứu chuyên sâu, benchmark thực nghiệm và đặc tả kiến trúc được đồng sáng tạo giữa đội ngũ I2FLabs cùng các tác tử AI.
        </p>
      </section>

      {/* Featured Report Card (60/40) */}
      {featuredReport && !isLoading && (
        <section className="mb-10">
          <Link
            to={`/reports/${featuredReport.slug}`}
            className="group grid overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition hover:border-accent/45 hover:shadow-md lg:grid-cols-12"
          >
            <div className="flex flex-col justify-between p-6 sm:p-8 lg:col-span-7">
              <div>
                <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-md bg-accent-soft px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-accent">
                    Featured
                  </span>
                  {featuredReport.category && (
                    <span
                      className="rounded-full px-2.5 py-0.5 font-medium"
                      style={{
                        backgroundColor: `${featuredReport.category.color}16`,
                        color: featuredReport.category.color,
                      }}
                    >
                      {featuredReport.category.name}
                    </span>
                  )}
                  <span className="font-mono text-muted">
                    {REPORT_TYPE_LABELS[featuredReport.report_type]}
                  </span>
                </div>

                <h2 className="font-serif text-2xl font-semibold leading-snug tracking-tight text-foreground transition group-hover:text-accent sm:text-3xl">
                  {featuredReport.title}
                </h2>

                {featuredReport.summary && (
                  <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted sm:text-base">
                    {featuredReport.summary}
                  </p>
                )}
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-4">
                <div className="flex flex-wrap items-center gap-2.5 text-xs text-muted">
                  {getAiBadgeText(featuredReport) && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-ai-border bg-ai-soft px-2.5 py-0.5 font-medium text-ai">
                      <Sparkles className="h-3 w-3" />
                      {getAiBadgeText(featuredReport)}
                    </span>
                  )}
                  <span className="font-mono tabular-nums">
                    {formatDate(
                      featuredReport.published_at ?? featuredReport.created_at
                    )}
                  </span>
                  <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                    <Clock className="h-3.5 w-3.5" />
                    {featuredReport.reading_time} phút đọc
                  </span>
                </div>

                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-accent transition group-hover:translate-x-0.5">
                  Đọc báo cáo
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </div>

            <div className="relative min-h-[220px] border-t border-border bg-subtle lg:col-span-5 lg:border-l lg:border-t-0">
              {featuredReport.cover_image_url ? (
                <img
                  src={featuredReport.cover_image_url}
                  alt={featuredReport.title}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                />
              ) : (
                <GeometricCover
                  color={featuredReport.category?.color || '#4F46E5'}
                  label={REPORT_TYPE_LABELS[featuredReport.report_type]}
                />
              )}
            </div>
          </Link>
        </section>
      )}

      {/* Sticky Filter & Discovery Bar */}
      <section className="sticky top-16 z-30 -mx-4 mb-8 border-y border-border bg-canvas/90 px-4 py-3.5 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition',
                selectedCategory === 'all'
                  ? 'border-foreground bg-foreground text-canvas'
                  : 'border-border bg-surface text-muted hover:border-foreground/30 hover:text-foreground'
              )}
            >
              <span>Tất cả</span>
              <span className="font-mono text-[10px] opacity-75 tabular-nums">
                {reports.length}
              </span>
            </button>

            {categories.map((cat) => {
              const count = categoryCounts.get(cat.id) ?? 0;
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition',
                    active
                      ? 'border-accent bg-accent-soft text-accent'
                      : 'border-border bg-surface text-muted hover:border-foreground/30 hover:text-foreground'
                  )}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span>{cat.name}</span>
                  <span className="font-mono text-[10px] opacity-70 tabular-nums">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Lọc theo tiêu đề, tag, AI model..."
                className="w-full rounded-lg border border-border bg-surface py-1.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                aria-label="Lọc theo loại tài liệu"
                className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground focus:border-accent focus:outline-none"
              >
                <option value="all">Mọi loại báo cáo</option>
                {availableTypes.map((type) => (
                  <option key={type} value={type}>
                    {REPORT_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>

              <div className="inline-flex rounded-lg border border-border bg-surface p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    'rounded-md p-1.5 transition',
                    viewMode === 'grid'
                      ? 'bg-subtle text-foreground'
                      : 'text-muted hover:text-foreground'
                  )}
                  title="Chế độ lưới (Grid)"
                  aria-label="Chế độ lưới"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={cn(
                    'rounded-md p-1.5 transition',
                    viewMode === 'list'
                      ? 'bg-subtle text-foreground'
                      : 'text-muted hover:text-foreground'
                  )}
                  title="Chế độ danh sách (Index)"
                  aria-label="Chế độ danh sách"
                >
                  <List className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content Area */}
      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="h-80 animate-pulse rounded-xl border border-border bg-surface"
            />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-6 text-sm text-foreground">
          <p className="font-medium text-red-600 dark:text-red-400">
            Không thể tải danh sách bài báo cáo
          </p>
          <p className="mt-1 text-xs text-muted">
            {error instanceof Error ? error.message : 'Lỗi kết nối Supabase.'}
          </p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface/50 px-6 py-16 text-center">
          <BookOpen className="h-8 w-8 text-muted" />
          <h3 className="mt-3 font-serif text-lg font-semibold text-foreground">
            Chưa tìm thấy báo cáo phù hợp
          </h3>
          <p className="mt-1 max-w-md text-sm text-muted">
            Thử đổi từ khóa tìm kiếm, chọn danh mục khác hoặc đặt lại bộ lọc.
          </p>
          {isFiltering && (
            <button
              type="button"
              onClick={resetFilters}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3.5 py-2 text-xs font-medium text-foreground transition hover:border-accent"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Đặt lại bộ lọc
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredReports.map((report) => (
            <ReportCard key={report.id} report={report} />
          ))}
        </section>
      ) : (
        <section className="overflow-hidden rounded-xl border border-border bg-surface divide-y divide-border">
          {filteredReports.map((report) => {
            const accentColor = report.category?.color || '#4F46E5';
            const aiBadge = getAiBadgeText(report);
            return (
              <Link
                key={report.id}
                to={`/reports/${report.slug}`}
                className="group flex flex-col justify-between gap-3 px-5 py-4 transition hover:bg-subtle/60 md:flex-row md:items-center"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span className="font-mono text-[11px] tabular-nums">
                      {formatDate(report.published_at ?? report.created_at)}
                    </span>
                    {report.category && (
                      <span
                        className="inline-flex items-center gap-1 font-medium"
                        style={{ color: accentColor }}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: accentColor }}
                        />
                        {report.category.name}
                      </span>
                    )}
                    <span className="rounded bg-subtle px-1.5 py-0.5 font-mono text-[10px] uppercase">
                      {REPORT_TYPE_LABELS[report.report_type]}
                    </span>
                  </div>
                  <h3 className="mt-1 font-serif text-base font-semibold text-foreground transition group-hover:text-accent">
                    {report.title}
                  </h3>
                  {report.summary && (
                    <p className="mt-1 line-clamp-1 text-xs text-muted">
                      {report.summary}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2.5">
                  {aiBadge && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-ai-border bg-ai-soft px-2.5 py-0.5 text-[11px] font-medium text-ai">
                      <Sparkles className="h-3 w-3" />
                      {aiBadge}
                    </span>
                  )}
                  {report.tags && report.tags.length > 0 && (
                    <span className="hidden items-center gap-1 font-mono text-[11px] text-muted xl:inline-flex">
                      <TagIcon className="h-3 w-3" />
                      {report.tags[0].name}
                    </span>
                  )}
                  <span className="font-mono text-xs text-muted tabular-nums">
                    {report.reading_time}m
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted transition group-hover:translate-x-0.5 group-hover:text-accent" />
                </div>
              </Link>
            );
          })}
        </section>
      )}
    </div>
  );
}
