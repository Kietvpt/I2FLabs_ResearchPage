import yaml from 'js-yaml';
import { estimateReadingTime, slugify } from '@/lib/utils';
import type {
  AiContributor,
  CollaborationMode,
  HumanAuthor,
  ReportInput,
  ReportStatus,
  ReportType,
  SourceMetadata,
} from '@/types/database';

export interface ParsedResearchMarkdown {
  report: Partial<ReportInput>;
  rawFrontmatter: Record<string, unknown>;
  suggestedCategorySlug: string;
}

const VALID_REPORT_TYPES: ReportType[] = [
  'whitepaper',
  'research',
  'question',
  'hypothesis',
  'empirical_poc',
  'benchmark',
  'specification',
  'trade_off',
  'debate',
  'failure_mode',
];

const PERSONA_ROLES: Record<string, { role: string; contribution: string }> = {
  An: {
    role: 'Tech Lead & AI Research Companion',
    contribution: 'Tổng hợp học thuật, thiết kế giao thức & định hướng nghiên cứu',
  },
  Vidus: {
    role: 'System Architect & Critical Reviewer',
    contribution: 'Phân tích kiến trúc, đánh đổi kỹ thuật & chế độ lỗi (FMEA)',
  },
  Luna: {
    role: 'UI/UX & Cognitive Ergonomics Specialist',
    contribution: 'Giả thuyết không gian tối giản & trải nghiệm nhận thức',
  },
  Zenith: {
    role: 'Empirical Benchmark & Telemetry Engineer',
    contribution: 'Thực nghiệm Sandbox PoC & đo lường định lượng Telemetry',
  },
};

function normalizeReportType(rawType: unknown, filename?: string): ReportType {
  if (typeof rawType === 'string') {
    const cleaned = rawType.trim().toLowerCase().replace(/-/g, '_');
    if (VALID_REPORT_TYPES.includes(cleaned as ReportType)) {
      return cleaned as ReportType;
    }
    if (cleaned === 'poc') return 'empirical_poc';
    if (cleaned === 'spec') return 'specification';
    if (cleaned === 'tradeoff') return 'trade_off';
    if (cleaned === 'failure') return 'failure_mode';
  }

  if (filename) {
    const lower = filename.toLowerCase();
    if (lower.includes('benchmark')) return 'benchmark';
    if (lower.includes('debate')) return 'debate';
    if (lower.includes('failure_mode') || lower.includes('fmea')) return 'failure_mode';
    if (lower.includes('hypothesis')) return 'hypothesis';
    if (lower.includes('poc')) return 'empirical_poc';
    if (lower.includes('question')) return 'question';
    if (lower.includes('spec')) return 'specification';
    if (lower.includes('tradeoff') || lower.includes('trade_off')) return 'trade_off';
    if (lower.includes('optimizing') || lower.includes('whitepaper')) return 'whitepaper';
  }

  return 'research';
}

function suggestCategorySlug(reportType: ReportType, filename?: string): string {
  switch (reportType) {
    case 'benchmark':
    case 'empirical_poc':
      return 'benchmarks-telemetry';
    case 'debate':
      return 'human-ai-debates';
    case 'specification':
    case 'trade_off':
      return 'engineering-specs';
    case 'failure_mode':
      return 'system-architecture';
    case 'whitepaper':
    case 'question':
    case 'hypothesis':
      return 'ai-cognitive-systems';
    default: {
      const lower = (filename || '').toLowerCase();
      if (lower.startsWith('arch_')) return 'system-architecture';
      if (lower.startsWith('sec_')) return 'system-architecture';
      return 'ai-cognitive-systems';
    }
  }
}

function normalizeStatus(rawStatus: unknown, defaultStatus: ReportStatus): ReportStatus {
  if (typeof rawStatus !== 'string') return defaultStatus;
  const lower = rawStatus.trim().toLowerCase();
  if (lower === 'completed' || lower === 'published') return 'published';
  if (lower === 'in_review' || lower === 'review') return 'in_review';
  if (lower === 'archived') return 'archived';
  if (lower === 'draft') return 'draft';
  return defaultStatus;
}

function extractTitleFromBody(body: string, filename?: string): string {
  const h1Match = body.match(/^#\s+(.+)$/m);
  if (h1Match?.[1]) {
    return h1Match[1].trim();
  }
  if (filename) {
    return filename
      .replace(/\.md$/i, '')
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return 'Untitled Research Report';
}

function extractAbstractFromBody(body: string): string {
  const abstractMatch = body.match(
    /^##\s+(?:\d+\.\s*)?(?:Abstract|Tóm tắt|Executive Summary)\s*\n+([\s\S]*?)(?=\n---|\n##\s|$)/im
  );
  const rawBlock = abstractMatch?.[1] || body;

  const paragraphs = rawBlock
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(
      (p) =>
        p.length > 30 &&
        !p.startsWith('#') &&
        !p.startsWith('```') &&
        !p.startsWith('|') &&
        !p.startsWith('>') &&
        !p.startsWith('- [')
    );

  const firstPara = (paragraphs[0] || '')
    .replace(/\$\$[\s\S]*?\$\$/g, '')
    .replace(/\$([^$]+)\$/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!firstPara) return '';
  return firstPara.length > 280 ? `${firstPara.slice(0, 277).trim()}...` : firstPara;
}

function buildAiContributors(fm: Record<string, unknown>): AiContributor[] {
  const contributors: AiContributor[] = [];
  const seen = new Set<string>();

  const addPersona = (name: string) => {
    const clean = name.trim();
    if (!clean || seen.has(clean.toLowerCase())) return;
    seen.add(clean.toLowerCase());
    const preset = PERSONA_ROLES[clean];
    contributors.push({
      agent_name: clean,
      role: preset?.role || 'AI Research Persona',
      contribution: preset?.contribution || 'Co-research & synthesis',
    });
  };

  if (Array.isArray(fm.ai_contributors)) {
    for (const item of fm.ai_contributors) {
      if (item && typeof item === 'object' && 'agent_name' in item) {
        const obj = item as AiContributor;
        if (obj.agent_name) {
          seen.add(obj.agent_name.toLowerCase());
          contributors.push(obj);
        }
      } else if (typeof item === 'string') {
        addPersona(item);
      }
    }
  }

  if (typeof fm.author_persona === 'string') {
    fm.author_persona.split(/[,&]/).forEach(addPersona);
  }

  if (Array.isArray(fm.co_authors)) {
    for (const co of fm.co_authors) {
      if (typeof co === 'string') addPersona(co);
    }
  }

  const debateDetails = fm.debate_details as { personas?: unknown } | undefined;
  if (debateDetails && Array.isArray(debateDetails.personas)) {
    for (const p of debateDetails.personas) {
      if (typeof p === 'string') addPersona(p);
    }
  }

  return contributors;
}

function buildHumanAuthors(fm: Record<string, unknown>): HumanAuthor[] {
  if (Array.isArray(fm.human_authors) && fm.human_authors.length > 0) {
    return fm.human_authors
      .map((item): HumanAuthor | null => {
        if (typeof item === 'string') return { name: item, role: 'Researcher' };
        if (item && typeof item === 'object' && 'name' in item) {
          return item as HumanAuthor;
        }
        return null;
      })
      .filter((x): x is HumanAuthor => Boolean(x));
  }
  return [{ name: 'I2FLabs Research Team', role: 'Lead Researcher' }];
}

function parseDateToIso(rawDate: unknown): string | null {
  if (!rawDate) return null;
  if (rawDate instanceof Date && !Number.isNaN(rawDate.getTime())) {
    return rawDate.toISOString();
  }
  if (typeof rawDate === 'string' && rawDate.trim()) {
    const parsed = new Date(rawDate.trim());
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }
  return null;
}

/**
 * Parse file Markdown có YAML frontmatter (tương thích hoàn toàn với .aevum/research/*.md)
 * thành đối tượng ReportInput + SourceMetadata chuẩn Database.
 */
export function parseResearchMarkdown(
  rawMarkdown: string,
  filename?: string,
  options?: { defaultStatus?: ReportStatus }
): ParsedResearchMarkdown {
  const normalized = rawMarkdown.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const fmMatch = normalized.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);

  let rawFrontmatter: Record<string, unknown> = {};
  let body = normalized;

  if (fmMatch) {
    try {
      const loaded = yaml.load(fmMatch[1]);
      if (loaded && typeof loaded === 'object' && !Array.isArray(loaded)) {
        rawFrontmatter = loaded as Record<string, unknown>;
      }
      body = fmMatch[2].trimStart();
    } catch {
      // Nếu YAML lỗi nhẹ vẫn giữ nguyên body để người dùng chỉnh tay
      body = fmMatch[2].trimStart();
    }
  }

  const title =
    typeof rawFrontmatter.title === 'string' && rawFrontmatter.title.trim()
      ? rawFrontmatter.title.trim()
      : extractTitleFromBody(body, filename);

  const reportType = normalizeReportType(
    rawFrontmatter.node_type ?? rawFrontmatter.report_type,
    filename
  );

  const summary =
    typeof rawFrontmatter.summary === 'string' && rawFrontmatter.summary.trim()
      ? rawFrontmatter.summary.trim()
      : extractAbstractFromBody(body);

  const tagNames: string[] = Array.isArray(rawFrontmatter.tags)
    ? rawFrontmatter.tags
        .map((t) => String(t).trim())
        .filter(Boolean)
    : [];

  const aiContributors = buildAiContributors(rawFrontmatter);
  const humanAuthors = buildHumanAuthors(rawFrontmatter);

  const modelUsed: string[] = Array.isArray(rawFrontmatter.model_used)
    ? rawFrontmatter.model_used.map((m) => String(m).trim()).filter(Boolean)
    : typeof rawFrontmatter.model_used === 'string' && rawFrontmatter.model_used.trim()
      ? [rawFrontmatter.model_used.trim()]
      : aiContributors.length > 0
        ? ['Aevum Multi-Agent Squad']
        : [];

  const collaborationMode: CollaborationMode =
    rawFrontmatter.collaboration_mode === 'human_led' ||
    rawFrontmatter.collaboration_mode === 'ai_assisted' ||
    rawFrontmatter.collaboration_mode === 'co_authored'
      ? rawFrontmatter.collaboration_mode
      : aiContributors.length > 0
        ? 'co_authored'
        : 'human_led';

  const status = normalizeStatus(
    rawFrontmatter.status,
    options?.defaultStatus ?? 'draft'
  );

  const publishedAt = parseDateToIso(rawFrontmatter.date ?? rawFrontmatter.published_at);

  const sourceMetadata: SourceMetadata = {};
  const metaKeys = [
    'mission_id',
    'node_id',
    'sphere_id',
    'tier',
    'author_persona',
    'inbound_edge',
    'benchmark_metrics',
    'sandbox_details',
    'debate_details',
  ];
  for (const key of metaKeys) {
    if (rawFrontmatter[key] !== undefined) {
      sourceMetadata[key] = rawFrontmatter[key];
    }
  }
  if (filename) {
    sourceMetadata.source_file = filename;
  }

  const slugSource =
    typeof rawFrontmatter.slug === 'string' && rawFrontmatter.slug.trim()
      ? rawFrontmatter.slug.trim()
      : filename
        ? filename.replace(/\.md$/i, '')
        : title;

  const report: Partial<ReportInput> = {
    title,
    slug: slugify(slugSource) || slugify(title),
    summary,
    content_md: body,
    cover_image_url:
      typeof rawFrontmatter.cover_image_url === 'string'
        ? rawFrontmatter.cover_image_url
        : null,
    report_type: reportType,
    status,
    is_featured: Boolean(rawFrontmatter.is_featured) || reportType === 'whitepaper',
    version:
      typeof rawFrontmatter.version === 'string' && rawFrontmatter.version.trim()
        ? rawFrontmatter.version.trim()
        : '1.0.0',
    reading_time: estimateReadingTime(body),
    human_authors: humanAuthors,
    ai_contributors: aiContributors,
    model_used: modelUsed,
    collaboration_mode: collaborationMode,
    source_metadata: sourceMetadata,
    published_at: status === 'published' ? publishedAt || new Date().toISOString() : publishedAt,
    tag_names: tagNames,
  };

  return {
    report,
    rawFrontmatter,
    suggestedCategorySlug: suggestCategorySlug(reportType, filename),
  };
}
