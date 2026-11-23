/**
 * I2FLabs Research CMS MCP Tools
 * Đồng bộ 100% dữ liệu thực từ cơ sở dữ liệu Supabase - Tuyệt đối không mock / fomo fallback.
 */
import { z } from 'zod';
import { CONFIG } from '../config.js';
import type { ResearchPaperPayload } from '../types.js';

// Supabase REST client helper - Luôn query database thật
async function fetchSupabase<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const token = CONFIG.supabase.serviceRoleKey || CONFIG.supabase.anonKey;
  if (!CONFIG.supabase.url || !token || CONFIG.supabase.url.includes('default.supabase.co')) {
    throw new Error('Supabase URL hoặc API Key chưa được cấu hình chính xác trên MCP Server.');
  }

  const res = await fetch(`${CONFIG.supabase.url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: token,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => '');
    throw new Error(`Truy vấn Supabase thất bại [HTTP ${res.status}]: ${errorBody}`);
  }

  return (await res.json()) as T;
}

export const researchCmsTools = [
  {
    name: 'i2f_list_research_domains',
    description:
      'Lấy danh sách các Miền nghiên cứu (Research Domains) chính thức của Viện Nghiên cứu I2FLabs trực tiếp từ Supabase.',
    parameters: z.object({}),
    handler: async () => {
      try {
        const liveDomains = await fetchSupabase<any[]>('research_domains?select=*&order=sort_order.asc');
        const domains = Array.isArray(liveDomains) ? liveDomains : [];

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  source: 'supabase_live',
                  total: domains.length,
                  domains,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (err: any) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: false,
                  source: 'supabase_live',
                  error: `Không thể kết nối hoặc truy vấn miền nghiên cứu từ Supabase: ${err.message}`,
                  domains: [],
                },
                null,
                2
              ),
            },
          ],
        };
      }
    },
  },

  {
    name: 'i2f_query_research_reports',
    description:
      'Tra cứu các bài báo cáo, whitepaper, benchmark telemetry và biên bản tranh biện trực tiếp từ database Supabase của I2FLabs.',
    parameters: z.object({
      query: z.string().optional().describe('Từ khóa tìm kiếm (tiêu đề, tóm tắt, slug)'),
      domainId: z.string().optional().describe('Lọc theo UUID miền nghiên cứu'),
      reportType: z
        .enum([
          'all',
          'whitepaper',
          'research',
          'benchmark',
          'empirical_poc',
          'specification',
          'hypothesis',
          'debate',
          'trade_off',
          'failure_mode',
          'question',
          'formal_proof',
          'ablation',
        ])
        .optional()
        .default('all')
        .describe('Định dạng tài liệu nghiên cứu'),
      publicationTrack: z
        .enum(['all', 'vibe_preprint', 'verified_tier1'])
        .optional()
        .default('all')
        .describe('Lọc theo tầng xuất bản: vibe_preprint (Open Lab) hoặc verified_tier1 (Đã kiểm định)'),
      limit: z.number().optional().default(10).describe('Số lượng kết quả tối đa'),
    }),
    handler: async (args: {
      query?: string;
      domainId?: string;
      reportType?: string;
      publicationTrack?: 'all' | 'vibe_preprint' | 'verified_tier1';
      limit?: number;
    }) => {
      try {
        let endpoint = `reports?select=*,domain:research_domains(*)&status=eq.published&order=published_at.desc&limit=${args.limit || 10}`;
        if (args.domainId) endpoint += `&domain_id=eq.${args.domainId}`;
        if (args.reportType && args.reportType !== 'all') endpoint += `&report_type=eq.${args.reportType}`;

        const liveReports = await fetchSupabase<any[]>(endpoint);
        const reports = Array.isArray(liveReports) ? liveReports : [];

        const q = (args.query || '').toLowerCase().trim();
        const filtered = reports.filter((r: any) => {
          const track = r.publication_track || r.source_metadata?.publication_track || 'verified_tier1';
          if (args.publicationTrack && args.publicationTrack !== 'all' && track !== args.publicationTrack) {
            return false;
          }
          if (!q) return true;
          return (
            r.title?.toLowerCase().includes(q) ||
            r.summary?.toLowerCase().includes(q) ||
            r.slug?.toLowerCase().includes(q) ||
            r.domain?.name?.toLowerCase().includes(q)
          );
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  source: 'supabase_live',
                  total: filtered.length,
                  reports: filtered,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (err: any) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: false,
                  source: 'supabase_live',
                  error: `Lỗi truy vấn báo cáo nghiên cứu từ Supabase: ${err.message}`,
                  reports: [],
                },
                null,
                2
              ),
            },
          ],
        };
      }
    },
  },

  {
    name: 'i2f_publish_paper',
    description:
      'Xuất bản hoặc lưu bản nháp bài báo cáo nghiên cứu từ Aevum OS trực tiếp vào CMS của I2FLabs Research Page qua Supabase.',
    parameters: z.object({
      title: z.string().describe('Tiêu đề bài nghiên cứu'),
      slug: z.string().optional().describe('URL slug định danh (tùy chọn)'),
      summary: z.string().describe('Tóm tắt khoa học (Abstract)'),
      content_md: z.string().describe('Nội dung nghiên cứu định dạng Markdown đầy đủ'),
      domain_id: z
        .string()
        .optional()
        .describe('UUID Miền nghiên cứu trong database'),
      report_type: z
        .enum([
          'whitepaper',
          'research',
          'benchmark',
          'empirical_poc',
          'specification',
          'hypothesis',
          'debate',
          'trade_off',
          'failure_mode',
          'question',
          'formal_proof',
          'ablation',
        ])
        .default('research'),
      status: z.enum(['draft', 'in_review', 'published']).default('draft'),
      publication_track: z
        .enum(['vibe_preprint', 'verified_tier1'])
        .optional()
        .describe('Tầng xuất bản V2R: vibe_preprint (Gate 1) hoặc verified_tier1 (Gate 2, yêu cầu confidence >= 0.85)'),
      confidence_score: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('Chỉ số hội tụ tin cậy R(n) trong khoảng [0, 1]'),
      human_authors: z
        .array(z.object({ name: z.string(), role: z.string().optional() }))
        .optional(),
      ai_contributors: z
        .array(
          z.object({
            agent_name: z.string(),
            role: z.string().optional(),
            contribution: z.string().optional(),
          })
        )
        .optional(),
      model_used: z.array(z.string()).optional(),
      tags: z.array(z.string()).optional(),
      source_metadata: z
        .record(z.unknown())
        .optional()
        .describe('Metadata cây tri thức RDD (node_id, sphere_id, tree_lineage, paired_pods, benchmark_metrics, ...)'),
    }),
    handler: async (args: ResearchPaperPayload) => {
      const generatedSlug =
        args.slug ||
        args.title
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/đ/g, 'd')
          .replace(/Đ/g, 'd')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '');

      const rawMeta =
        args.source_metadata && typeof args.source_metadata === 'object'
          ? { ...args.source_metadata }
          : {};

      const requestedTrack =
        args.publication_track ||
        (rawMeta.publication_track as 'vibe_preprint' | 'verified_tier1' | undefined) ||
        (args.status === 'published' ? 'verified_tier1' : 'vibe_preprint');

      const rawConfidence =
        typeof args.confidence_score === 'number'
          ? args.confidence_score
          : typeof rawMeta.confidence_score === 'number'
            ? (rawMeta.confidence_score as number)
            : undefined;

      let effectiveTrack = requestedTrack;
      let epistemicGateNotice: string | undefined;

      // V2R-SRP FMEA Gate 2 Guard: chặn xuất bản Tier-1 nếu độ tin cậy R(n) chưa đạt ngưỡng 0.85
      if (
        args.status === 'published' &&
        requestedTrack === 'verified_tier1' &&
        typeof rawConfidence === 'number' &&
        rawConfidence < 0.85
      ) {
        effectiveTrack = 'vibe_preprint';
        epistemicGateNotice = `Confidence R(n)=${rawConfidence} < 0.85: tự động phân loại về track 'vibe_preprint' (Gate 1) để bảo vệ chuẩn Tier-1.`;
      }

      const mergedSourceMetadata: Record<string, unknown> = {
        ...rawMeta,
        cognitive_node_type: args.report_type,
        publication_track: effectiveTrack,
        ...(typeof rawConfidence === 'number' ? { confidence_score: rawConfidence } : {}),
      };

      const basePayload: Record<string, unknown> = {
        title: args.title.trim(),
        slug: generatedSlug,
        summary: args.summary?.trim() || null,
        content_md: args.content_md,
        domain_id: args.domain_id || null,
        report_type: args.report_type,
        status: args.status || 'draft',
        human_authors:
          args.human_authors && args.human_authors.length > 0
            ? args.human_authors
            : [{ name: 'I2FLabs Research Team', role: 'Lead Researcher' }],
        ai_contributors: args.ai_contributors || [],
        model_used: args.model_used || [],
        source_metadata: mergedSourceMetadata,
        reading_time: Math.max(1, Math.ceil(args.content_md.split(/\s+/).length / 200)),
        published_at: args.status === 'published' ? new Date().toISOString() : null,
      };

      const insertReportWithCompatFallback = async () => {
        try {
          return await fetchSupabase<any[]>('reports', {
            method: 'POST',
            headers: { Prefer: 'return=representation' },
            body: JSON.stringify(basePayload),
          });
        } catch (firstErr: any) {
          const msg = String(firstErr?.message || '');
          // Tương thích ngược nếu Supabase chưa chạy migration 006_v2r_symbiotic_workflow.sql
          if (
            msg.includes('reports_report_type_check') &&
            (args.report_type === 'formal_proof' || args.report_type === 'ablation')
          ) {
            const compatType = args.report_type === 'formal_proof' ? 'specification' : 'research';
            return await fetchSupabase<any[]>('reports', {
              method: 'POST',
              headers: { Prefer: 'return=representation' },
              body: JSON.stringify({ ...basePayload, report_type: compatType }),
            });
          }
          throw firstErr;
        }
      };

      try {
        const liveCreated = await insertReportWithCompatFallback();

        if (!Array.isArray(liveCreated) || liveCreated.length === 0) {
          throw new Error('Cơ sở dữ liệu Supabase không phản hồi bản ghi sau khi insert.');
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: `Đã xuất bản thành công bài nghiên cứu "${args.title}" vào database thực tế của I2FLabs!`,
                  ...(epistemicGateNotice ? { epistemicGateNotice } : {}),
                  publicationTrack: effectiveTrack,
                  source: 'supabase_live',
                  persistedToSupabase: true,
                  paper: liveCreated[0],
                  viewUrl: `/reports/${generatedSlug}`,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (err: any) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: false,
                  source: 'supabase_live',
                  error: `Không thể lưu bài nghiên cứu vào database Supabase: ${err.message}`,
                  persistedToSupabase: false,
                },
                null,
                2
              ),
            },
          ],
        };
      }
    },
  },
];
