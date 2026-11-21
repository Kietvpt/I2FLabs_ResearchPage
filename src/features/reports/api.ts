import {
  isMissingTableError,
  isSupabaseConfigured,
  supabase,
} from '@/lib/supabase';
import type {
  Category,
  CollaborationMode,
  ReportType,
  ReportWithRelations,
  Tag,
} from '@/types/database';
import { DEMO_CATEGORIES, DEMO_REPORTS } from './demoData';

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  whitepaper: 'Whitepaper',
  research: 'Research',
  question: 'Research Question',
  hypothesis: 'Hypothesis',
  empirical_poc: 'Empirical PoC',
  benchmark: 'Benchmark',
  specification: 'Specification',
  trade_off: 'Trade-off Matrix',
  debate: 'Dialectic Debate',
  failure_mode: 'Failure Mode',
};

export const COLLABORATION_MODE_LABELS: Record<CollaborationMode, string> = {
  co_authored: 'Human–AI Co-Authored',
  human_led: 'Human-Led Research',
  ai_assisted: 'AI-Assisted Synthesis',
};

interface RawReportRow extends ReportWithRelations {
  report_tags?: Array<{ tag: Tag | null }>;
}

function normalizeReport(row: RawReportRow): ReportWithRelations {
  const tags: Tag[] = (row.report_tags ?? [])
    .map((rt) => rt.tag)
    .filter((tag): tag is Tag => Boolean(tag));

  const { report_tags: _unused, ...rest } = row;
  void _unused;

  return {
    ...rest,
    human_authors: Array.isArray(rest.human_authors) ? rest.human_authors : [],
    ai_contributors: Array.isArray(rest.ai_contributors)
      ? rest.ai_contributors
      : [],
    model_used: Array.isArray(rest.model_used) ? rest.model_used : [],
    source_metadata:
      rest.source_metadata && typeof rest.source_metadata === 'object'
        ? rest.source_metadata
        : {},
    tags,
  };
}

export interface PublishedReportsResult {
  reports: ReportWithRelations[];
  categories: Category[];
  needsMigration: boolean;
  isDemo: boolean;
  errorMessage?: string;
}

export async function fetchCategories(): Promise<{
  categories: Category[];
  needsMigration: boolean;
}> {
  if (!isSupabaseConfigured) {
    return { categories: DEMO_CATEGORIES, needsMigration: true };
  }

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    if (isMissingTableError(error)) {
      return { categories: DEMO_CATEGORIES, needsMigration: true };
    }
    throw new Error(error.message);
  }

  return {
    categories: (data as Category[]) ?? [],
    needsMigration: false,
  };
}

export async function fetchPublishedReports(): Promise<PublishedReportsResult> {
  if (!isSupabaseConfigured) {
    return {
      reports: DEMO_REPORTS,
      categories: DEMO_CATEGORIES,
      needsMigration: true,
      isDemo: true,
    };
  }

  const [catRes, repRes] = await Promise.all([
    supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }),
    supabase
      .from('reports')
      .select(
        `
        *,
        category:categories(*),
        domain:research_domains(*),
        report_tags(
          tag:tags(*)
        )
      `
      )
      .eq('status', 'published')
      .order('is_featured', { ascending: false })
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false }),
  ]);

  if (isMissingTableError(catRes.error) || isMissingTableError(repRes.error)) {
    return {
      reports: DEMO_REPORTS,
      categories: DEMO_CATEGORIES,
      needsMigration: true,
      isDemo: true,
    };
  }

  if (repRes.error) {
    throw new Error(repRes.error.message);
  }

  const categories = (catRes.data as Category[]) ?? [];
  const reports = ((repRes.data as RawReportRow[]) ?? []).map(normalizeReport);

  return {
    reports,
    categories,
    needsMigration: false,
    isDemo: false,
  };
}

export interface ReportDetailResult {
  report: ReportWithRelations | null;
  relatedReports: ReportWithRelations[];
  needsMigration: boolean;
  isDemo: boolean;
}

export async function fetchReportBySlug(
  slug: string
): Promise<ReportDetailResult> {
  if (!isSupabaseConfigured) {
    const found = DEMO_REPORTS.find((r) => r.slug === slug) ?? null;
    const related = found
      ? DEMO_REPORTS.filter((r) => r.id !== found.id).slice(0, 3)
      : [];
    return {
      report: found,
      relatedReports: related,
      needsMigration: true,
      isDemo: true,
    };
  }

  const { data, error } = await supabase
    .from('reports')
    .select(
      `
      *,
      category:categories(*),
      domain:research_domains(*),
      report_tags(
        tag:tags(*)
      )
    `
    )
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error)) {
      const found = DEMO_REPORTS.find((r) => r.slug === slug) ?? null;
      const related = found
        ? DEMO_REPORTS.filter((r) => r.id !== found.id).slice(0, 3)
        : [];
      return {
        report: found,
        relatedReports: related,
        needsMigration: true,
        isDemo: true,
      };
    }
    throw new Error(error.message);
  }

  if (!data) {
    return {
      report: null,
      relatedReports: [],
      needsMigration: false,
      isDemo: false,
    };
  }

  const report = normalizeReport(data as RawReportRow);

  let relatedQuery = supabase
    .from('reports')
    .select(
      `
      *,
      category:categories(*),
      domain:research_domains(*),
      report_tags(
        tag:tags(*)
      )
    `
    )
    .eq('status', 'published')
    .neq('id', report.id)
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(3);

  if (report.domain_id) {
    relatedQuery = relatedQuery.eq('domain_id', report.domain_id);
  } else if (report.category_id) {
    relatedQuery = relatedQuery.eq('category_id', report.category_id);
  }

  const { data: relatedData } = await relatedQuery;
  const relatedReports = ((relatedData as RawReportRow[]) ?? []).map(
    normalizeReport
  );

  return {
    report,
    relatedReports,
    needsMigration: false,
    isDemo: false,
  };
}
