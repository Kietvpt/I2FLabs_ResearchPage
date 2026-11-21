/**
 * MCP Resources for I2FLabs & Aevum OS
 * Kết nối tài nguyên thực từ cơ sở dữ liệu Supabase & Aevum Daemon
 */
import { CONFIG } from '../config.js';

async function fetchSupabaseResource(path: string) {
  const token = CONFIG.supabase.serviceRoleKey || CONFIG.supabase.anonKey;
  if (!CONFIG.supabase.url || !token || CONFIG.supabase.url.includes('default.supabase.co')) {
    throw new Error('Supabase URL hoặc API Key chưa được thiết lập.');
  }
  const res = await fetch(`${CONFIG.supabase.url}/rest/v1/${path}`, {
    headers: {
      apikey: token,
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(`Supabase API HTTP ${res.status}: ${errorText}`);
  }
  return await res.json();
}

export const allResources = [
  {
    uri: 'aevum://system/status',
    name: 'Aevum Local OS Status',
    mimeType: 'application/json',
    description: 'Trạng thái hoạt động, cổng kết nối và độ trễ của Aevum OS local.',
    read: async () => ({
      contents: [
        {
          uri: 'aevum://system/status',
          mimeType: 'application/json',
          text: JSON.stringify(
            {
              system: 'Aevum OS Polymorphic Node',
              defaultEndpoint: 'http://127.0.0.1:3344/sse',
              status: 'ready',
              supportedPersonas: ['an', 'vidus', 'nia', 'kai', 'zenith', 'luna'],
              timestamp: new Date().toISOString(),
            },
            null,
            2
          ),
        },
      ],
    }),
  },

  {
    uri: 'i2f://domains/list',
    name: 'I2FLabs Research Domains Directory',
    mimeType: 'application/json',
    description: 'Danh mục các Miền nghiên cứu chính thức của Viện I2FLabs tải trực tiếp từ cơ sở dữ liệu Supabase.',
    read: async () => {
      try {
        const live = await fetchSupabaseResource('research_domains?select=id,name,slug,chair_lead,tagline,description,sort_order&order=sort_order.asc');
        const domains = Array.isArray(live) ? live : [];
        return {
          contents: [
            {
              uri: 'i2f://domains/list',
              mimeType: 'application/json',
              text: JSON.stringify(
                {
                  institute: 'I2FLabs Institute of AI & Cognitive Architecture',
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
          contents: [
            {
              uri: 'i2f://domains/list',
              mimeType: 'application/json',
              text: JSON.stringify(
                {
                  institute: 'I2FLabs Institute of AI & Cognitive Architecture',
                  source: 'supabase_live',
                  error: err.message,
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
    uri: 'i2f://reports/recent',
    name: 'I2FLabs Recent Published Reports',
    mimeType: 'application/json',
    description: 'Danh sách các bài báo cáo khoa học mới nhất tải trực tiếp từ cơ sở dữ liệu Supabase thực tế.',
    read: async () => {
      try {
        const liveReports = await fetchSupabaseResource(
          'reports?select=id,title,slug,report_type,published_at,reading_time,domain:research_domains(name,slug)&status=eq.published&order=published_at.desc&limit=10'
        );
        const reportsList = Array.isArray(liveReports) ? liveReports : [];
        return {
          contents: [
            {
              uri: 'i2f://reports/recent',
              mimeType: 'application/json',
              text: JSON.stringify(
                {
                  institute: 'I2FLabs Institute of AI & Cognitive Architecture',
                  source: 'supabase_live',
                  total: reportsList.length,
                  reports: reportsList,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (err: any) {
        return {
          contents: [
            {
              uri: 'i2f://reports/recent',
              mimeType: 'application/json',
              text: JSON.stringify(
                {
                  institute: 'I2FLabs Institute of AI & Cognitive Architecture',
                  source: 'supabase_live',
                  error: err.message,
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
];
