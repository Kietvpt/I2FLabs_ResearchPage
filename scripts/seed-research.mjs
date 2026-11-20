#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { createClient } from '@supabase/supabase-js';

const ROOT_DIR = process.cwd();
const ENV_PATH = path.resolve(ROOT_DIR, '.env.local');
const RESEARCH_DIR = path.resolve(ROOT_DIR, '.aevum', 'research');

function loadEnvLocal(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf8');
  const result = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) continue;
    const key = line.slice(0, eqIdx).trim();
    let val = line.slice(eqIdx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    result[key] = val;
  }
  return result;
}

function slugify(input) {
  return String(input || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function estimateReadingTime(markdown) {
  if (!markdown || !markdown.trim()) return 1;
  const plain = markdown
    .replace(/```[\s\S]*?```/g, ' code ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_~\-|]/g, ' ')
    .trim();
  const words = plain.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

const VALID_TYPES = new Set([
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
]);

const PERSONA_ROLES = {
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

function resolveReportType(fm, filename) {
  const raw = fm.node_type ?? fm.report_type;
  if (typeof raw === 'string') {
    const cleaned = raw.trim().toLowerCase().replace(/-/g, '_');
    if (VALID_TYPES.has(cleaned)) return cleaned;
  }
  const lower = filename.toLowerCase();
  if (lower.includes('benchmark')) return 'benchmark';
  if (lower.includes('debate')) return 'debate';
  if (lower.includes('failure_mode')) return 'failure_mode';
  if (lower.includes('hypothesis')) return 'hypothesis';
  if (lower.includes('poc')) return 'empirical_poc';
  if (lower.includes('question')) return 'question';
  if (lower.includes('spec')) return 'specification';
  if (lower.includes('tradeoff')) return 'trade_off';
  if (lower.includes('optimizing')) return 'whitepaper';
  return 'research';
}

function resolveCategorySlug(reportType) {
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
    default:
      return 'ai-cognitive-systems';
  }
}

function extractAbstract(body) {
  const match = body.match(
    /^##\s+(?:\d+\.\s*)?(?:Abstract|Tóm tắt|Executive Summary)\s*\n+([\s\S]*?)(?=\n---|\n##\s|$)/im
  );
  const block = match?.[1] || body;
  const paragraphs = block
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(
      (p) =>
        p.length > 30 &&
        !p.startsWith('#') &&
        !p.startsWith('```') &&
        !p.startsWith('|') &&
        !p.startsWith('>')
    );
  const clean = (paragraphs[0] || '')
    .replace(/\$\$[\s\S]*?\$\$/g, '')
    .replace(/\$([^$]+)\$/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return clean.length > 280 ? `${clean.slice(0, 277).trim()}...` : clean;
}

function buildAiContributors(fm) {
  const list = [];
  const seen = new Set();
  const add = (name) => {
    const clean = String(name || '').trim();
    if (!clean || seen.has(clean.toLowerCase())) return;
    seen.add(clean.toLowerCase());
    const preset = PERSONA_ROLES[clean];
    list.push({
      agent_name: clean,
      role: preset?.role || 'AI Research Persona',
      contribution: preset?.contribution || 'Co-research & synthesis',
    });
  };
  if (typeof fm.author_persona === 'string') {
    fm.author_persona.split(/[,&]/).forEach(add);
  }
  if (Array.isArray(fm.co_authors)) fm.co_authors.forEach(add);
  if (fm.debate_details?.personas && Array.isArray(fm.debate_details.personas)) {
    fm.debate_details.personas.forEach(add);
  }
  return list;
}

async function main() {
  const env = { ...loadEnvLocal(ENV_PATH), ...process.env };
  const supabaseUrl = env.VITE_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error(
      '❌ Thiếu VITE_SUPABASE_URL hoặc SUPABASE_SECRET_KEY trong .env.local (hoặc biến môi trường).'
    );
    process.exit(1);
  }

  if (!fs.existsSync(RESEARCH_DIR)) {
    console.error(`❌ Không tìm thấy thư mục nghiên cứu: ${RESEARCH_DIR}`);
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. Ensure default categories exist
  const defaultCategories = [
    {
      name: 'AI & Cognitive Systems',
      slug: 'ai-cognitive-systems',
      description:
        'Nghiên cứu về hệ thống AI, tối ưu hóa Flow State và cộng tác nhận thức giữa người và máy.',
      color: '#7C3AED',
      sort_order: 1,
    },
    {
      name: 'System Architecture',
      slug: 'system-architecture',
      description: 'Thiết kế kiến trúc phân tán, hạ tầng dữ liệu và mô hình hệ thống quy mô lớn.',
      color: '#2563EB',
      sort_order: 2,
    },
    {
      name: 'Benchmarks & Telemetry',
      slug: 'benchmarks-telemetry',
      description: 'Đo lường thực nghiệm, kiểm thử hiệu năng, phân tích thống kê và bằng chứng định lượng.',
      color: '#059669',
      sort_order: 3,
    },
    {
      name: 'Engineering & Specs',
      slug: 'engineering-specs',
      description: 'Đặc tả kỹ thuật (RFC/Spec), Proof-of-Concept và đánh đổi công nghệ.',
      color: '#D97706',
      sort_order: 4,
    },
    {
      name: 'Human-AI Debates',
      slug: 'human-ai-debates',
      description: 'Các phiên phản biện đa chiều giữa chuyên gia và AI Personas về giả thuyết và rủi ro.',
      color: '#E11D48',
      sort_order: 5,
    },
  ];

  const { data: catRows, error: catErr } = await supabase
    .from('categories')
    .upsert(defaultCategories, { onConflict: 'slug' })
    .select('id, slug');

  if (catErr) {
    console.error('❌ Lỗi khi upsert categories (hãy chắc chắn đã chạy migration 001_initial_schema.sql):', catErr.message);
    process.exit(1);
  }

  const categoryBySlug = new Map((catRows || []).map((c) => [c.slug, c.id]));

  // 2. Scan .aevum/research/*.md
  const files = fs
    .readdirSync(RESEARCH_DIR)
    .filter(
      (f) =>
        f.toLowerCase().endsWith('.md') &&
        f.toLowerCase() !== 'readme.md' &&
        f.toLowerCase() !== 'mission_template.md'
    )
    .sort();

  console.log(`📚 Tìm thấy ${files.length} bài báo cáo trong .aevum/research/\n`);

  let seededCount = 0;

  for (const filename of files) {
    const fullPath = path.join(RESEARCH_DIR, filename);
    const raw = fs.readFileSync(fullPath, 'utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
    const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);

    let fm = {};
    let body = raw;
    if (fmMatch) {
      fm = yaml.load(fmMatch[1]) || {};
      body = fmMatch[2].trimStart();
    }

    const reportType = resolveReportType(fm, filename);
    const categorySlug = resolveCategorySlug(reportType);
    const categoryId = categoryBySlug.get(categorySlug) ?? null;

    const title =
      typeof fm.title === 'string' && fm.title.trim()
        ? fm.title.trim()
        : filename.replace(/\.md$/i, '');

    const slug = slugify(filename.replace(/\.md$/i, ''));
    const aiContributors = buildAiContributors(fm);

    const sourceMetadata = { source_file: filename };
    for (const key of [
      'mission_id',
      'node_id',
      'sphere_id',
      'tier',
      'author_persona',
      'inbound_edge',
      'benchmark_metrics',
      'sandbox_details',
      'debate_details',
    ]) {
      if (fm[key] !== undefined) sourceMetadata[key] = fm[key];
    }

    const publishedDate = fm.date ? new Date(fm.date) : new Date();
    const publishedAt = Number.isNaN(publishedDate.getTime())
      ? new Date().toISOString()
      : publishedDate.toISOString();

    const payload = {
      title,
      slug,
      summary: extractAbstract(body) || null,
      content_md: body,
      cover_image_url: null,
      category_id: categoryId,
      report_type: reportType,
      status: fm.status === 'draft' ? 'draft' : 'published',
      is_featured: reportType === 'whitepaper',
      version: '1.0.0',
      reading_time: estimateReadingTime(body),
      human_authors: [{ name: 'I2FLabs Research Team', role: 'Lead Researcher' }],
      ai_contributors: aiContributors,
      model_used: ['Aevum Multi-Agent Squad'],
      collaboration_mode: aiContributors.length > 0 ? 'co_authored' : 'human_led',
      source_metadata: sourceMetadata,
      published_at: publishedAt,
    };

    const { data: savedReport, error: repErr } = await supabase
      .from('reports')
      .upsert(payload, { onConflict: 'slug' })
      .select('id, slug')
      .single();

    if (repErr) {
      console.error(`❌ Lỗi seed "${filename}":`, repErr.message);
      continue;
    }

    // Sync tags
    const rawTags = Array.isArray(fm.tags) ? fm.tags.map((t) => String(t).trim()).filter(Boolean) : [];
    const uniqueTags = Array.from(
      new Map(rawTags.map((name) => [slugify(name), name])).entries()
    ).filter(([s]) => Boolean(s));

    if (uniqueTags.length > 0 && savedReport?.id) {
      const { data: tagRows, error: tagErr } = await supabase
        .from('tags')
        .upsert(
          uniqueTags.map(([s, name]) => ({ slug: s, name })),
          { onConflict: 'slug' }
        )
        .select('id');

      if (!tagErr && tagRows?.length) {
        await supabase.from('report_tags').delete().eq('report_id', savedReport.id);
        await supabase.from('report_tags').insert(
          tagRows.map((t) => ({ report_id: savedReport.id, tag_id: t.id }))
        );
      }
    }

    seededCount += 1;
    console.log(`✅ [${reportType.padEnd(13)}] ${slug} (${uniqueTags.length} tags)`);
  }

  console.log(`\n🎉 Hoàn tất! Đã seed thành công ${seededCount}/${files.length} bài báo cáo vào Supabase.`);
}

main().catch((err) => {
  console.error('❌ Lỗi không mong muốn:', err);
  process.exit(1);
});
