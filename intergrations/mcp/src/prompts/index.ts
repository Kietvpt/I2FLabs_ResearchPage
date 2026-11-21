/**
 * MCP Prompts for I2FLabs & Aevum OS Dialectics
 */

export const allPrompts = [
  {
    name: 'cadence_flow_audit',
    description:
      'Tạo kịch bản đánh giá trạng thái Dòng chảy (Flow State) và nhịp làm việc Cadence 50/10.',
    arguments: [
      {
        name: 'engineerName',
        description: 'Tên kỹ sư hoặc bí danh nghiên cứu',
        required: false,
      },
      {
        name: 'workloadDescription',
        description: 'Mô tả tác vụ kỹ thuật đang thực thi',
        required: true,
      },
    ],
    generate: (args: { engineerName?: string; workloadDescription: string }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Bạn là Chuyên gia Cộng thái học Nhận thức (Cognitive Ergonomics). Hãy thực hiện kiểm định nhịp Cadence 50/10 cho kỹ sư [${args.engineerName || 'Kỹ sư I2FLabs'}]:
Tác vụ: "${args.workloadDescription}"

Yêu cầu kiểm định:
1. Xác định nguy cơ quá tải nhận thức ngoại lai (Extraneous Cognitive Load).
2. Kiểm tra độ trễ phản hồi của công cụ AI có dưới ngưỡng 300ms không.
3. Đề xuất cổng kiểm soát Human-in-the-Loop Gate trong chu kỳ 10 phút nghỉ hồi phục.`,
          },
        },
      ],
    }),
  },

  {
    name: 'research_peer_review',
    description:
      'Kích hoạt phiên tranh biện phản biện học thuật chuẩn mực giữa Vidus (Kiến trúc sư) và An (Điều phối quy trình).',
    arguments: [
      {
        name: 'paperTopic',
        description: 'Chủ đề bài báo cáo khoa học',
        required: true,
      },
      {
        name: 'coreHypothesis',
        description: 'Giả thuyết nghiên cứu cốt lõi',
        required: true,
      },
    ],
    generate: (args: { paperTopic: string; coreHypothesis: string }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Khởi tạo phiên tranh biện học thuật Aevum Dialectic Session:
Chủ đề: "${args.paperTopic}"
Giả thuyết cốt lõi: "${args.coreHypothesis}"

Phân vai:
- Vidus (Architectural Guard): Đặt ra các câu hỏi phản biện nghiêm khắc về điểm gãy logic, chi phí biên và rủi ro tự động hóa mù quáng.
- An (Workflow Strategist): Bảo vệ tính khả thi thực nghiệm, nhịp độ gia tốc và phương án giải phóng nhận thức cho con người.
- Kết luận: Tổng hợp ma trận đánh đổi (Trade-off Matrix) và mức độ đồng thuận (%) theo chuẩn công bố I2FLabs.`,
          },
        },
      ],
    }),
  },
];
