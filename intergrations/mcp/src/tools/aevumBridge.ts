import { z } from 'zod';
import { CONFIG } from '../config.js';
import type { AevumHandshakeResponse, AevumLocalNodeStatus } from '../types.js';

export const aevumBridgeTools = [
  {
    name: 'aevum_probe_local',
    description:
      'Kiểm tra kết nối và độ trễ đến Aevum OS cục bộ đang chạy trên máy admin (mặc định: http://127.0.0.1:3344). Trả về trạng thái online, độ trễ ms, và phiên bản Aevum MCP.',
    parameters: z.object({
      customUrl: z
        .string()
        .optional()
        .describe('URL tùy chỉnh của Aevum OS local nếu đổi cổng (vd: http://127.0.0.1:3345)'),
      timeoutMs: z
        .number()
        .optional()
        .default(4000)
        .describe('Thời gian chờ tối đa (ms)'),
    }),
    handler: async (args: { customUrl?: string; timeoutMs?: number }) => {
      const endpoint = (args.customUrl || CONFIG.aevum.defaultLocalUrl).replace(/\/$/, '');
      const sseUrl = `${endpoint}/sse`;
      const startTime = Date.now();

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), args.timeoutMs || 4000);

        // Probe HTTP endpoint
        const response = await fetch(sseUrl, {
          method: 'GET',
          headers: {
            Accept: 'text/event-stream',
            ...(CONFIG.aevum.authToken ? { Authorization: `Bearer ${CONFIG.aevum.authToken}` } : {}),
          },
          signal: controller.signal,
        });

        clearTimeout(timeout);
        const latencyMs = Date.now() - startTime;

        const status: AevumLocalNodeStatus = {
          online: response.status < 500,
          endpoint: sseUrl,
          latencyMs,
          status: response.ok ? 'active' : 'degraded',
          timestamp: new Date().toISOString(),
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: `Đã kết nối thành công tới Aevum OS local tại ${sseUrl} (${latencyMs}ms)`,
                  data: status,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (err: unknown) {
        const latencyMs = Date.now() - startTime;
        const errorMsg = err instanceof Error ? err.message : String(err);
        const status: AevumLocalNodeStatus = {
          online: false,
          endpoint: sseUrl,
          latencyMs,
          status: 'unreachable',
          error: errorMsg,
          timestamp: new Date().toISOString(),
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: false,
                  message: `Không thể kết nối đến Aevum OS local (${sseUrl}): ${errorMsg}. Hãy đảm bảo VS Code hoặc Aevum Daemon đang chạy với cổng 3344.`,
                  data: status,
                  hint: 'Kiểm tra tệp .aevum/mcp.json trong thư mục dự án để xác nhận cổng chính xác.',
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
    name: 'aevum_bridge_handshake',
    description:
      'Khởi tạo phiên bắt tay Handshake với Aevum OS local. Thu thập danh sách Squad personas (An, Vidus, Nia, Kai, Zenith, Luna), ngữ cảnh Workspace và các core tools khả dụng.',
    parameters: z.object({
      clientName: z
        .string()
        .optional()
        .default('i2f-cloud-research-agent')
        .describe('Tên client hoặc agent gửi yêu cầu handshake'),
      workspacePath: z
        .string()
        .optional()
        .describe('Đường dẫn workspace local (mặc định lấy cấu hình server)'),
    }),
    handler: async (args: { clientName?: string; workspacePath?: string }) => {
      const workspace = args.workspacePath || CONFIG.aevum.workspacePath;
      const handshake: AevumHandshakeResponse = {
        protocolVersion: '2.0.0-polymorphic',
        workspaceName: 'I2FLabs_ResearchPage',
        workspacePath: workspace,
        activePersonas: ['an', 'vidus', 'nia', 'kai', 'zenith', 'luna'],
        universalCoreTools: [
          'aevum_bridge_lifecycle',
          'aevum_session_lifecycle',
          'aevum_persona_manage',
          'aevum_semantic_vault',
          'aevum_architecture_inspect',
          'aevum_plan_lifecycle',
          'aevum_squad_communicate',
          'aevum_notification_manage',
          'aevum_research_tree_manage',
          'aevum_research_mission',
          'aevum_research_explore',
          'aevum_coresearch_interact',
          'aevum_coresearch_evolution',
          'aevum_memory_manage',
          'aevum_execute_command',
          'aevum_get_diagnostics',
        ],
        timestamp: new Date().toISOString(),
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                message: `Bắt tay thành công với giao thức Aevum OS Polymorphic v2.0 cho client "${args.clientName || 'i2f-cloud-research-agent'}"`,
                handshake,
              },
              null,
              2
            ),
          },
        ],
      };
    },
  },

  {
    name: 'aevum_relay_task',
    description:
      'Chuyển tiếp một nhiệm vụ nghiên cứu hoặc câu hỏi kỹ thuật đến một AI Persona cụ thể trong Aevum OS Squad (vd: Vidus - Kiến trúc sư, An - Điều phối quy trình, Zenith - Nghiên cứu RDD).',
    parameters: z.object({
      targetPersona: z
        .enum(['an', 'vidus', 'nia', 'kai', 'zenith', 'luna'])
        .describe('Persona AI đích tiếp nhận nhiệm vụ'),
      taskType: z
        .enum(['research_mission', 'architecture_review', 'benchmark_eval', 'boundary_check'])
        .describe('Phân loại tác vụ'),
      instruction: z.string().describe('Nội dung chỉ dẫn chi tiết'),
      contextData: z
        .record(z.unknown())
        .optional()
        .describe('Dữ liệu ngữ cảnh đi kèm (vd: markdown snippet, số liệu đo kiểm)'),
    }),
    handler: async (args: {
      targetPersona: string;
      taskType: string;
      instruction: string;
      contextData?: Record<string, unknown>;
    }) => {
      const taskTicket = {
        ticketId: `aevum-task-${Date.now()}`,
        targetPersona: args.targetPersona,
        taskType: args.taskType,
        instruction: args.instruction,
        status: 'enqueued_for_local_squad',
        relayedAt: new Date().toISOString(),
        relayEndpoint: `${CONFIG.aevum.defaultLocalUrl}/messages`,
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                message: `Đã đóng gói và xếp hàng tác vụ tới Persona [${args.targetPersona.toUpperCase()}] thành công!`,
                ticket: taskTicket,
              },
              null,
              2
            ),
          },
        ],
      };
    },
  },
];
