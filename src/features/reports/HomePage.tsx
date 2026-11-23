import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Copy,
  Database,
  RotateCcw,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { useDomains } from '@/context/DomainContext';
import type { PublicationTrack, ReportType, ReportWithRelations } from '@/types/database';
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



function getReportTrack(report: ReportWithRelations): PublicationTrack {
  return report.publication_track ?? report.source_metadata?.publication_track ?? 'verified_tier1';
}

function DeepMindNewsRow({ report }: { report: ReportWithRelations }) {
  const domainName = report.domain?.name ?? report.category?.name;
  const track = getReportTrack(report);

  return (
    <Link to={`/reports/${report.slug}`} className="deepmind-news-row group">
      <div className="news-content">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="news-title">
            {report.title}
          </h3>
          {track === 'vibe_preprint' && (
            <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] font-medium text-amber-600 dark:text-amber-400">
              Open Lab Preprint
            </span>
          )}
        </div>
        <div className="news-meta">
          <span>{formatDate(report.published_at ?? report.created_at)}</span>
          <span className="separator">•</span>
          {domainName && (
            <>
              <span className="font-medium text-foreground/80">{domainName}</span>
              <span className="separator">•</span>
            </>
          )}
          <span>{report.reading_time} min read</span>
          {report.ai_contributors.length > 0 && (
            <>
              <span className="separator">•</span>
              <span>w/ {report.ai_contributors.map(a => a.agent_name).join(', ')}</span>
            </>
          )}
        </div>
      </div>

      <div className="news-thumb">
        {report.cover_image_url ? (
          <img
            src={report.cover_image_url}
            alt={report.title}
            loading="lazy"
          />
        ) : (
          <GeometricCover
            color="#71717a"
            compact
          />
        )}
      </div>
    </Link>
  );
}

function DeepMindSpotlightCard({ report }: { report: ReportWithRelations }) {
  const domainName = report.domain?.name ?? report.category?.name;

  return (
    <Link to={`/reports/${report.slug}`} className="deepmind-feature-card group">
      <div className="feature-media">
        {report.cover_image_url ? (
          <img
            src={report.cover_image_url}
            alt={report.title}
            loading="lazy"
          />
        ) : (
          <GeometricCover color="#71717a" />
        )}
        <div className="feature-scrim" />
      </div>

      <div className="feature-info">
        {domainName && (
          <span className="feature-category">
            {domainName}
          </span>
        )}
        <h3 className="feature-title line-clamp-2">
          {report.title}
        </h3>
        <span className="feature-pill-btn">
          Read paper
        </span>
      </div>
    </Link>
  );
}

export function HomePage() {
  const { domains, selectedDomain, selectedDomainId, setSelectedDomainId } = useDomains();
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedTrack, setSelectedTrack] = useState<'all' | PublicationTrack>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['public-reports'],
    queryFn: fetchPublishedReports,
    staleTime: 60_000,
  });

  const reports = data?.reports ?? [];
  const needsMigration = data?.needsMigration ?? false;

  const isFiltering =
    selectedType !== 'all' ||
    selectedTrack !== 'all' ||
    selectedDomainId !== 'all' ||
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
      if (selectedDomainId !== 'all') {
        const matchesDomain =
          report.domain_id === selectedDomainId ||
          report.domain?.id === selectedDomainId ||
          report.domain?.slug === selectedDomainId;
        if (!matchesDomain) return false;
      }
      if (selectedType !== 'all' && report.report_type !== selectedType) {
        return false;
      }
      if (selectedTrack !== 'all' && getReportTrack(report) !== selectedTrack) {
        return false;
      }
      if (q) {
        const haystack = [
          report.title,
          report.summary ?? '',
          report.domain?.name ?? '',
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
    selectedDomainId,
    selectedType,
    selectedTrack,
    searchQuery,
  ]);

  const resetFilters = () => {
    setSelectedDomainId('all');
    setSelectedType('all');
    setSelectedTrack('all');
    setSearchQuery('');
  };

  const spotlightReports = useMemo(() => {
    if (reports.length === 0) return [];
    const featured = reports.filter((r) => r.is_featured);
    if (featured.length >= 3) return featured.slice(0, 3);
    return reports.slice(0, 3);
  }, [reports]);

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8 sm:px-6 lg:px-8">
      {needsMigration && (
        <div className="mb-8 flex flex-col justify-between gap-3 rounded-xl border border-border bg-subtle px-4 py-3.5 text-sm sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <Database className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
            <div>
              <p className="font-medium text-foreground">
                Đang hiển thị dữ liệu mẫu từ{' '}
                <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-xs">
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
            className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-subtle sm:self-center"
          >
            <Copy className="h-3.5 w-3.5" />
            Copy SQL path
          </button>
        </div>
      )}

      {/* Hero — Google DeepMind Authentic Style */}
      <section className="py-12 sm:py-16 text-center">
        <h1 className="font-sans text-4xl font-medium tracking-tight text-foreground sm:text-6xl lg:text-7xl">
          Our next era of frontier intelligence
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base text-muted sm:text-lg">
          Advancing multimodal cognition, multi-agent symbiosis, and flow state telemetry to benefit humanity.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <a
            href="#latest-research"
            className="inline-flex items-center rounded-full bg-foreground px-5 py-2 text-sm font-medium text-canvas transition hover:opacity-90"
          >
            Explore research
          </a>
          <Link
            to="/admin"
            className="inline-flex items-center rounded-full border border-border px-5 py-2 text-sm font-medium text-foreground transition hover:bg-subtle"
          >
            Research portal
          </Link>
        </div>
      </section>

      {/* 3 Top Spotlight Cards (Google DeepMind Hero Carousel Pattern) */}
      {!isFiltering && spotlightReports.length > 0 && !isLoading && (
        <section className="mb-16 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:gap-6">
          {spotlightReports.map((report) => (
            <DeepMindSpotlightCard key={report.id} report={report} />
          ))}
        </section>
      )}

      {/* Latest Research Section Header & Filters */}
      <section id="latest-research" className="mb-8 pt-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
          <h2 className="font-sans text-2xl font-medium tracking-tight text-foreground sm:text-3xl">
            Latest research
          </h2>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedDomainId('all')}
              className={cn(
                'deepmind-pill-tab',
                selectedDomainId === 'all' && 'active'
              )}
            >
              All Domains
            </button>
            {domains.map((dom) => (
              <button
                key={dom.id}
                type="button"
                onClick={() => setSelectedDomainId(dom.id)}
                className={cn(
                  'deepmind-pill-tab',
                  selectedDomainId === dom.id && 'active'
                )}
              >
                {dom.name}
              </button>
            ))}
          </div>
        </div>

        {/* Search & View Mode Controls */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="relative min-w-[240px] flex-1 sm:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by title, topic, or model..."
              className="w-full rounded-full border border-border bg-surface py-1.5 pl-9 pr-4 text-sm text-foreground placeholder:text-muted focus:border-border-hover focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedTrack}
              onChange={(e) => setSelectedTrack(e.target.value as 'all' | PublicationTrack)}
              aria-label="Filter by epistemic track"
              className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground focus:outline-none"
            >
              <option value="all">All tracks</option>
              <option value="verified_tier1">Tier-1 Verified</option>
              <option value="vibe_preprint">Open Lab Preprints</option>
            </select>

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              aria-label="Filter by report type"
              className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground focus:outline-none"
            >
              <option value="all">All formats</option>
              {availableTypes.map((type) => (
                <option key={type} value={type}>
                  {REPORT_TYPE_LABELS[type]}
                </option>
              ))}
            </select>

            <div className="inline-flex rounded-full border border-border bg-surface p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={cn(
                  'rounded-full px-2.5 py-1 text-xs font-medium transition',
                  viewMode === 'list'
                    ? 'bg-foreground text-canvas'
                    : 'text-muted hover:text-foreground'
                )}
                title="List view"
              >
                List
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={cn(
                  'rounded-full px-2.5 py-1 text-xs font-medium transition',
                  viewMode === 'grid'
                    ? 'bg-foreground text-canvas'
                    : 'text-muted hover:text-foreground'
                )}
                title="Grid view"
              >
                Grid
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Active Domain Context Banner */}
      {selectedDomain && (
        <div className="mb-8 flex items-center justify-between rounded-xl border border-border bg-surface/70 px-4 py-3 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-foreground shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-foreground">
                  Lĩnh vực: {selectedDomain.name}
                </span>
                <span className="rounded border border-border bg-subtle px-1.5 py-0.5 text-[10px] font-mono text-muted">
                  Phân ban học thuật
                </span>
              </div>
              {selectedDomain.tagline && (
                <p className="text-[11px] text-muted truncate mt-0.5">{selectedDomain.tagline}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSelectedDomainId('all')}
            className="rounded-lg border border-border bg-canvas px-2.5 py-1 text-xs text-muted hover:text-foreground hover:bg-subtle transition-colors shrink-0"
          >
            Xem toàn viện ×
          </button>
        </div>
      )}

      {/* Research Publication Feed */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div
              key={idx}
              className="h-24 animate-pulse rounded-xl bg-subtle"
            />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-border bg-surface p-6 text-sm text-foreground">
          <p className="font-medium text-red-500">
            Unable to load publications
          </p>
          <p className="mt-1 text-xs text-muted">
            {error instanceof Error ? error.message : 'Database connection error.'}
          </p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="py-16 text-center">
          <p className="font-sans text-lg text-foreground">
            No research papers found
          </p>
          <p className="mt-1 text-sm text-muted">
            Try adjusting your search criteria or clearing filters.
          </p>
          {isFiltering && (
            <button
              type="button"
              onClick={resetFilters}
              className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-1.5 text-xs font-medium text-foreground hover:bg-subtle"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset filters
            </button>
          )}
        </div>
      ) : viewMode === 'list' ? (
        <section className="divide-y divide-border">
          {filteredReports.map((report) => (
            <DeepMindNewsRow key={report.id} report={report} />
          ))}
        </section>
      ) : (
        <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
          {filteredReports.map((report) => (
            <DeepMindSpotlightCard key={report.id} report={report} />
          ))}
        </section>
      )}
    </div>
  );
}
