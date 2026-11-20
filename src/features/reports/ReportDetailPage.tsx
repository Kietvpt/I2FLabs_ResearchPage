import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  BarChart3,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  Cpu,
  Edit3,
  ListTree,
  MessageSquare,
  Printer,
  Quote,
  Share2,
  Sparkles,
  Tag as TagIcon,
  Terminal,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { useAuth } from '@/context/AuthContext';
import type { ReportWithRelations } from '@/types/database';
import { cn, formatDate } from '@/lib/utils';
import {
  COLLABORATION_MODE_LABELS,
  fetchReportBySlug,
  REPORT_TYPE_LABELS,
} from './api';

interface TocHeading {
  id: string;
  text: string;
  level: 2 | 3;
}

type CitationFormat = 'bibtex' | 'ieee' | 'markdown';

function buildCitation(
  report: ReportWithRelations,
  format: CitationFormat,
  url: string
): string {
  const year = new Date(
    report.published_at ?? report.created_at
  ).getFullYear();
  const authorsList = [
    ...report.human_authors.map((a) => a.name),
    ...report.ai_contributors.map((a) => `${a.agent_name} (AI)`),
  ];
  const authors = authorsList.length > 0 ? authorsList.join(', ') : 'I2FLabs';
  const bibKey = `i2flabs_${report.slug.replace(/-/g, '_').slice(0, 24)}_${year}`;

  if (format === 'bibtex') {
    return `@techreport{${bibKey},
  title = {${report.title}},
  author = {${authors}},
  institution = {I2FLabs Research},
  year = {${year}},
  version = {${report.version}},
  url = {${url}}
}`;
  }

  if (format === 'ieee') {
    return `${authors}, "${report.title}," I2FLabs Research, v${report.version}, ${year}. [Online]. Available: ${url}`;
  }

  return `[${report.title}](${url}) — ${authors} (I2FLabs Research, ${year})`;
}

function StructuredMetricsCard({ report }: { report: ReportWithRelations }) {
  const meta = report.source_metadata || {};
  const benchmarkEntries = meta.benchmark_metrics
    ? Object.entries(meta.benchmark_metrics)
    : [];
  const sandboxEntries = meta.sandbox_details
    ? Object.entries(meta.sandbox_details)
    : [];
  const debate = meta.debate_details;

  if (
    benchmarkEntries.length === 0 &&
    sandboxEntries.length === 0 &&
    !debate
  ) {
    return null;
  }

  return (
    <section className="mt-6 rounded-xl border border-border bg-surface p-5 shadow-sm">
      {benchmarkEntries.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-accent">
            <BarChart3 className="h-4 w-4" />
            <span>Benchmark Metric Highlights</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {benchmarkEntries.map(([key, value]) => (
              <div
                key={key}
                className="rounded-lg border border-border bg-subtle/60 px-3.5 py-2.5"
              >
                <div className="text-[11px] font-medium text-muted">
                  {key.replace(/_/g, ' ')}
                </div>
                <div className="mt-1 font-mono text-sm font-semibold tabular-nums text-foreground">
                  {String(value)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {sandboxEntries.length > 0 && (
        <div className={cn(benchmarkEntries.length > 0 && 'mt-5 border-t border-border pt-4')}>
          <div className="mb-2.5 flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-muted">
            <Terminal className="h-3.5 w-3.5" />
            <span>Sandbox & Telemetry Environment</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {sandboxEntries.map(([key, value]) => (
              <span
                key={key}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-subtle px-2.5 py-1 font-mono text-xs text-foreground"
              >
                <span className="text-muted">{key.replace(/_/g, ' ')}:</span>
                <span className="font-medium">{String(value)}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {debate && (
        <div
          className={cn(
            (benchmarkEntries.length > 0 || sandboxEntries.length > 0) &&
              'mt-5 border-t border-border pt-4'
          )}
        >
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Dialectic Debate Summary</span>
            </div>
            {typeof debate.consensus_percent === 'number' && (
              <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 font-mono text-xs font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                Consensus: {debate.consensus_percent}%
              </span>
            )}
          </div>
          {debate.topic_debated && (
            <p className="text-sm text-foreground/90">{debate.topic_debated}</p>
          )}
          {Array.isArray(debate.personas) && debate.personas.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-2">
              {debate.personas.map((persona) => (
                <span
                  key={persona}
                  className="rounded-full border border-ai-border bg-ai-soft px-2.5 py-0.5 text-xs font-medium text-ai"
                >
                  {persona}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export function ReportDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { isAdmin } = useAuth();
  const articleRef = useRef<HTMLDivElement | null>(null);

  const [progress, setProgress] = useState(0);
  const [headings, setHeadings] = useState<TocHeading[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [mobileTocOpen, setMobileTocOpen] = useState(false);
  const [citeOpen, setCiteOpen] = useState(false);
  const [citeFormat, setCiteFormat] = useState<CitationFormat>('bibtex');
  const [copiedCite, setCopiedCite] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['public-report', slug],
    queryFn: () => fetchReportBySlug(slug || ''),
    enabled: Boolean(slug),
    staleTime: 60_000,
  });

  const report = data?.report ?? null;
  const relatedReports = data?.relatedReports ?? [];

  // Reading progress bar
  useEffect(() => {
    const onScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) {
        setProgress(0);
        return;
      }
      setProgress(Math.min(100, Math.max(0, (scrollTop / docHeight) * 100)));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Extract H2 & H3 headings from rendered DOM (exact match with rehype-slug)
  useEffect(() => {
    if (!report || !articleRef.current) {
      setHeadings([]);
      return;
    }

    const timer = window.setTimeout(() => {
      const container = articleRef.current;
      if (!container) return;
      const nodes = Array.from(
        container.querySelectorAll<HTMLHeadingElement>('h2[id], h3[id]')
      );
      const extracted: TocHeading[] = nodes.map((el) => ({
        id: el.id,
        text: (el.textContent || '').trim(),
        level: el.tagName === 'H3' ? 3 : 2,
      }));
      setHeadings(extracted);
      if (extracted.length > 0) {
        setActiveId(extracted[0].id);
      }
    }, 60);

    return () => window.clearTimeout(timer);
  }, [report]);

  // ScrollSpy via IntersectionObserver
  useEffect(() => {
    if (headings.length === 0) return;

    const elements = headings
      .map((h) => document.getElementById(h.id))
      .filter((el): el is HTMLElement => Boolean(el));

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        rootMargin: '-88px 0px -70% 0px',
        threshold: 0.1,
      }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [headings]);

  const currentUrl =
    typeof window !== 'undefined' ? window.location.href : '';

  const citationText = useMemo(() => {
    if (!report) return '';
    return buildCitation(report, citeFormat, currentUrl);
  }, [report, citeFormat, currentUrl]);

  const handleCopyCitation = async () => {
    try {
      await navigator.clipboard.writeText(citationText);
      setCopiedCite(true);
      toast.success(`Đã sao chép trích dẫn (${citeFormat.toUpperCase()})`);
      setTimeout(() => setCopiedCite(false), 1800);
    } catch {
      toast.error('Không thể sao chép trích dẫn');
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      toast.success('Đã sao chép liên kết bài báo cáo');
    } catch {
      toast.error('Không thể sao chép liên kết');
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[900px] px-4 py-12 sm:px-6">
        <div className="space-y-4">
          <div className="h-4 w-32 animate-pulse rounded bg-subtle" />
          <div className="h-10 w-3/4 animate-pulse rounded bg-subtle" />
          <div className="h-24 w-full animate-pulse rounded-xl bg-surface" />
          <div className="h-64 w-full animate-pulse rounded-xl bg-surface" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="font-serif text-2xl font-semibold text-foreground">
          Không thể tải báo cáo
        </h1>
        <p className="mt-2 text-sm text-muted">
          {error instanceof Error ? error.message : 'Lỗi kết nối Supabase.'}
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground hover:border-accent"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại thư viện
        </Link>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <p className="font-mono text-xs uppercase tracking-wider text-muted">
          404 • Report Not Found
        </p>
        <h1 className="mt-2 font-serif text-3xl font-semibold text-foreground">
          Không tìm thấy bài báo cáo này
        </h1>
        <p className="mt-2 text-sm text-muted">
          Báo cáo có thể đã bị gỡ, đổi đường dẫn hoặc đang ở trạng thái bản nháp.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-hover"
        >
          <ArrowLeft className="h-4 w-4" />
          Về thư viện báo cáo
        </Link>
      </div>
    );
  }

  const accentColor = report.category?.color || '#4F46E5';

  return (
    <>
      {/* 2px Reading Progress Bar */}
      <div
        className="fixed left-0 top-0 z-50 h-[2px] bg-accent transition-[width] duration-75 print:hidden"
        style={{ width: `${progress}%` }}
        aria-hidden="true"
      />

      <article className="mx-auto max-w-[1360px] px-4 py-8 sm:px-6 lg:px-8">
        {/* Header Block */}
        <header className="mx-auto max-w-[920px]">
          <nav
            className="mb-4 flex flex-wrap items-center gap-1.5 text-xs text-muted print:hidden"
            aria-label="Breadcrumb"
          >
            <Link to="/" className="transition hover:text-foreground">
              Research
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            {report.category ? (
              <span
                className="font-medium"
                style={{ color: accentColor }}
              >
                {report.category.name}
              </span>
            ) : (
              <span>Uncategorized</span>
            )}
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="rounded bg-subtle px-1.5 py-0.5 font-mono text-[10px] uppercase text-foreground/80">
              {REPORT_TYPE_LABELS[report.report_type]}
            </span>
          </nav>

          <h1 className="font-serif text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl lg:text-[2.5rem]">
            {report.title}
          </h1>

          {report.summary && (
            <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">
              {report.summary}
            </p>
          )}

          {/* Human–AI Collaboration Card */}
          <section className="mt-6 rounded-xl border border-ai-border bg-ai-soft/60 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ai-border/70 pb-3">
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ai">
                <Sparkles className="h-4 w-4" />
                <span>
                  {COLLABORATION_MODE_LABELS[report.collaboration_mode]}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 font-mono text-xs tabular-nums text-muted">
                <span>{formatDate(report.published_at ?? report.created_at)}</span>
                <span>•</span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {report.reading_time} phút đọc
                </span>
                <span>•</span>
                <span>v{report.version}</span>
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <div className="mb-1.5 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-muted">
                  <User className="h-3.5 w-3.5" />
                  <span>Human Researchers</span>
                </div>
                {report.human_authors.length > 0 ? (
                  <ul className="space-y-1 text-sm">
                    {report.human_authors.map((author, idx) => (
                      <li key={idx} className="text-foreground">
                        <span className="font-medium">{author.name}</span>
                        {author.role && (
                          <span className="ml-1.5 text-xs text-muted">
                            ({author.role})
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-foreground">I2FLabs Research Team</p>
                )}
              </div>

              <div>
                <div className="mb-1.5 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-muted">
                  <Sparkles className="h-3.5 w-3.5 text-ai" />
                  <span>AI Co-Authors</span>
                </div>
                {report.ai_contributors.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {report.ai_contributors.map((ai, idx) => (
                      <span
                        key={idx}
                        title={ai.contribution || ai.role || ai.agent_name}
                        className="inline-flex items-center gap-1 rounded-md border border-ai-border bg-surface/90 px-2 py-0.5 text-xs font-medium text-ai"
                      >
                        {ai.agent_name}
                        {ai.role && (
                          <span className="font-normal text-muted">
                            · {ai.role}
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted">Không ghi nhận tác tử AI riêng</p>
                )}
              </div>

              <div>
                <div className="mb-1.5 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-muted">
                  <Cpu className="h-3.5 w-3.5" />
                  <span>Models Used</span>
                </div>
                {report.model_used.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {report.model_used.map((model) => (
                      <span
                        key={model}
                        className="rounded-md border border-border bg-surface px-2 py-0.5 font-mono text-[11px] text-foreground"
                      >
                        {model}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="font-mono text-xs text-muted">—</p>
                )}
              </div>
            </div>
          </section>

          {/* Structured Metric Highlights (Benchmark / Sandbox / Debate) */}
          <StructuredMetricsCard report={report} />

          {/* Mobile/Tablet Action Bar + Collapsible TOC */}
          <div className="mt-6 flex flex-wrap items-center gap-2 lg:hidden print:hidden">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Thư viện
            </Link>
            <button
              type="button"
              onClick={() => setCiteOpen((o) => !o)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground"
            >
              <Quote className="h-3.5 w-3.5" />
              Trích dẫn
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground"
            >
              <Share2 className="h-3.5 w-3.5" />
              Chia sẻ
            </button>
            {isAdmin && !data?.isDemo && (
              <Link
                to={`/admin/reports/${report.id}/edit`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent-soft px-3 py-1.5 text-xs font-medium text-accent"
              >
                <Edit3 className="h-3.5 w-3.5" />
                Chỉnh sửa
              </Link>
            )}
          </div>

          {headings.length > 0 && (
            <div className="mt-4 rounded-xl border border-border bg-surface xl:hidden print:hidden">
              <button
                type="button"
                onClick={() => setMobileTocOpen((o) => !o)}
                className="flex w-full items-center justify-between px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted"
              >
                <span className="inline-flex items-center gap-2">
                  <ListTree className="h-4 w-4" />
                  Mục lục bài viết ({headings.length})
                </span>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 transition-transform',
                    mobileTocOpen && 'rotate-180'
                  )}
                />
              </button>
              {mobileTocOpen && (
                <ul className="space-y-1 border-t border-border px-4 py-3 text-sm">
                  {headings.map((h) => (
                    <li key={h.id} className={cn(h.level === 3 && 'pl-4')}>
                      <a
                        href={`#${h.id}`}
                        onClick={() => setMobileTocOpen(false)}
                        className={cn(
                          'block py-1 transition',
                          activeId === h.id
                            ? 'font-medium text-accent'
                            : 'text-muted hover:text-foreground'
                        )}
                      >
                        {h.text}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Inline Citation Panel (toggleable from mobile or desktop) */}
          {citeOpen && (
            <div className="mt-4 rounded-xl border border-border bg-surface p-4 shadow-sm print:hidden">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1 rounded-lg bg-subtle p-1">
                  {(['bibtex', 'ieee', 'markdown'] as CitationFormat[]).map(
                    (fmt) => (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => setCiteFormat(fmt)}
                        className={cn(
                          'rounded-md px-2.5 py-1 font-mono text-xs uppercase transition',
                          citeFormat === fmt
                            ? 'bg-surface font-semibold text-foreground shadow-sm'
                            : 'text-muted hover:text-foreground'
                        )}
                      >
                        {fmt}
                      </button>
                    )
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleCopyCitation}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white transition hover:bg-accent-hover"
                >
                  {copiedCite ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  <span>{copiedCite ? 'Đã sao chép' : 'Copy Citation'}</span>
                </button>
              </div>
              <pre className="mt-3 overflow-x-auto rounded-lg border border-border bg-subtle p-3 font-mono text-xs leading-relaxed text-foreground">
                {citationText}
              </pre>
            </div>
          )}
        </header>

        {/* 3-Column Desktop Reader Layout */}
        <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[200px_minmax(0,1fr)] xl:grid-cols-[200px_minmax(0,72ch)_240px] xl:justify-center">
          {/* Left Sticky Actions Column */}
          <aside className="hidden lg:block print:hidden">
            <div className="sticky top-24 space-y-2">
              <Link
                to="/"
                className="flex w-full items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-muted transition hover:border-accent/40 hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Tất cả báo cáo</span>
              </Link>

              <div className="pt-2">
                <p className="mb-2 px-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-muted">
                  Tiện ích đọc
                </p>
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => setCiteOpen((o) => !o)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition',
                      citeOpen
                        ? 'border-accent bg-accent-soft text-accent'
                        : 'border-border bg-surface text-muted hover:border-accent/40 hover:text-foreground'
                    )}
                  >
                    <Quote className="h-3.5 w-3.5" />
                    <span>Trích dẫn (Cite)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleShare}
                    className="flex w-full items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-muted transition hover:border-accent/40 hover:text-foreground"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    <span>Chia sẻ liên kết</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex w-full items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-muted transition hover:border-accent/40 hover:text-foreground"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>In / Xuất PDF</span>
                  </button>

                  {isAdmin && !data?.isDemo && (
                    <Link
                      to={`/admin/reports/${report.id}/edit`}
                      className="flex w-full items-center gap-2 rounded-lg border border-accent/40 bg-accent-soft px-3 py-2 text-xs font-medium text-accent transition hover:bg-accent hover:text-white"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>Chỉnh sửa bài</span>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </aside>

          {/* Center Main Content Column (68ch-72ch) */}
          <div className="min-w-0">
            {report.cover_image_url && (
              <figure className="mb-8 overflow-hidden rounded-xl border border-border bg-surface">
                <img
                  src={report.cover_image_url}
                  alt={report.title}
                  className="max-h-[420px] w-full object-cover"
                />
              </figure>
            )}

            <div ref={articleRef}>
              <MarkdownRenderer content={report.content_md} />
            </div>

            {/* Tags Footer */}
            {report.tags && report.tags.length > 0 && (
              <div className="mt-10 flex flex-wrap items-center gap-2 border-t border-border pt-6">
                <span className="inline-flex items-center gap-1 font-mono text-xs text-muted">
                  <TagIcon className="h-3.5 w-3.5" />
                  Tags:
                </span>
                {report.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="rounded-full border border-border bg-surface px-2.5 py-0.5 font-mono text-xs text-muted"
                  >
                    #{tag.name}
                  </span>
                ))}
              </div>
            )}

            {/* Related Reports */}
            {relatedReports.length > 0 && (
              <section className="mt-12 border-t border-border pt-8 print:hidden">
                <h2 className="font-serif text-xl font-semibold text-foreground">
                  Báo cáo liên quan
                </h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {relatedReports.slice(0, 2).map((rel) => (
                    <Link
                      key={rel.id}
                      to={`/reports/${rel.slug}`}
                      className="group rounded-xl border border-border bg-surface p-4 transition hover:border-accent/40"
                    >
                      <div className="flex items-center gap-2 font-mono text-[11px] text-muted">
                        <span>{REPORT_TYPE_LABELS[rel.report_type]}</span>
                        <span>•</span>
                        <span>{rel.reading_time} phút</span>
                      </div>
                      <h3 className="mt-1.5 line-clamp-2 font-serif text-base font-semibold text-foreground transition group-hover:text-accent">
                        {rel.title}
                      </h3>
                      {rel.summary && (
                        <p className="mt-1.5 line-clamp-2 text-xs text-muted">
                          {rel.summary}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right Sticky TOC Column */}
          <aside className="hidden xl:block print:hidden">
            {headings.length > 0 && (
              <div className="sticky top-24">
                <p className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-wider text-muted">
                  On this page
                </p>
                <nav aria-label="Mục lục bài viết">
                  <ul className="space-y-1.5 border-l border-border text-[13px]">
                    {headings.map((h) => {
                      const isActive = activeId === h.id;
                      return (
                        <li key={h.id}>
                          <a
                            href={`#${h.id}`}
                            className={cn(
                              '-ml-px block border-l-2 py-1 transition',
                              h.level === 3 ? 'pl-6 text-xs' : 'pl-3.5',
                              isActive
                                ? 'border-accent font-medium text-accent'
                                : 'border-transparent text-muted hover:border-border hover:text-foreground'
                            )}
                          >
                            {h.text}
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                </nav>
              </div>
            )}
          </aside>
        </div>
      </article>
    </>
  );
}
